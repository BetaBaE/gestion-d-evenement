import { DateTime } from 'luxon';
import { EmailLog } from '../models/EmailLog.js';
import { EmailSettings } from '../models/EmailSettings.js';
import { Participant } from '../models/Participant.js';
import { env } from '../config/env.js';
import { deliverEmail } from './emailService.js';
import { emailQuota, classifyEmailError, afterFailure, estimatedMinutes, DEFAULT_LIMITE_PAR_MINUTE } from './emailRules.js';

const SEND_LOCK_MS = 2 * 60 * 1000;

/**
 * Queues an email (CONFIRMATION or BADGE) for a participant. With a
 * dedupeKey, queuing the same email twice (resumed job, double click) is a
 * no-op.
 */
export async function enqueueEmail({ type, participant, event, dedupeKey }) {
  const doc = {
    participantId: participant._id,
    eventId: event._id,
    organisateurId: event.organisateurId,
    type,
    destinataire: participant.email,
    statut: 'EN_FILE',
    tentatives: 0,
    prochainEssai: new Date(),
  };
  if (dedupeKey) {
    await EmailLog.updateOne({ dedupeKey }, { $setOnInsert: { ...doc, dedupeKey } }, { upsert: true });
  } else {
    await EmailLog.create(doc);
  }
}

/** Effective sending settings of an organisateur (its mailbox, or the platform's). */
async function sendingSettings(organisateurId) {
  const settings = await EmailSettings.findOne({ organisateurId });
  const ownMailbox = !!(settings?.actif && settings.dernierTestStatut !== 'ECHEC');
  return {
    settings,
    ownMailbox,
    limiteParMinute: (ownMailbox && settings.limiteParMinute) || DEFAULT_LIMITE_PAR_MINUTE,
    limiteParJour: ownMailbox ? settings.limiteParJour : undefined,
    alerteAuth: ownMailbox && settings.alerteAuth?.le ? settings.alerteAuth : null,
  };
}

async function sendOne(log, ctx) {
  try {
    const { expediteurUtilise } = await deliverEmail(log);
    await EmailLog.updateOne(
      { _id: log._id },
      { $set: { statut: 'ENVOYE', expediteurUtilise, lockedUntil: null, erreur: null, erreurType: null, sentAt: new Date() } },
    );
    if (log.type === 'BADGE') await Participant.updateOne({ _id: log.participantId }, { $set: { badgeEnvoyeLe: new Date() } });
    return 'ENVOYE';
  } catch (error) {
    const erreurType = classifyEmailError(error);
    const next = afterFailure({ erreurType, tentatives: log.tentatives });
    await EmailLog.updateOne(
      { _id: log._id },
      { $set: { statut: next.statut, prochainEssai: next.prochainEssai, erreur: error.message, erreurType, lockedUntil: null } },
    );
    if (erreurType === 'AUTH' && ctx.ownMailbox) {
      // Credentials refused: alert on the event page, later emails fail fast.
      await EmailSettings.updateOne({ _id: ctx.settings._id }, { $set: { alerteAuth: { le: new Date(), message: error.message } } });
    }
    return erreurType;
  }
}

/**
 * Worker step: sends due emails, organisateur by organisateur, within each
 * one's rate limit, until `deadline`.
 */
export async function processEmailQueue(deadline) {
  const now = new Date();
  // A send interrupted by a crash may or may not have left: never resend it
  // automatically (no duplicates) — it shows as a failure to resend by hand.
  await EmailLog.updateMany(
    { statut: 'ENVOI', lockedUntil: { $lt: now } },
    { $set: { statut: 'ECHEC', erreurType: 'INTERROMPU', erreur: "Envoi interrompu (redémarrage du serveur) : vérifiez puis renvoyez si besoin.", lockedUntil: null } },
  );

  const organisateurIds = await EmailLog.distinct('organisateurId', { statut: 'EN_FILE', prochainEssai: { $lte: now } });
  for (const organisateurId of organisateurIds) {
    if (Date.now() > deadline - 2000) return;
    // eslint-disable-next-line no-await-in-loop
    const ctx = await sendingSettings(organisateurId);
    if (ctx.alerteAuth) {
      // eslint-disable-next-line no-await-in-loop
      await EmailLog.updateMany(
        { organisateurId, statut: 'EN_FILE', prochainEssai: { $lte: now } },
        { $set: { statut: 'ECHEC', erreurType: 'AUTH', erreur: `Identifiants SMTP refusés : ${ctx.alerteAuth.message}` } },
      );
      continue;
    }
    const dayStart = DateTime.now().setZone(env.appTimezone).startOf('day').toJSDate();
    // eslint-disable-next-line no-await-in-loop
    const [sentLastMinute, sentToday] = await Promise.all([
      EmailLog.countDocuments({ organisateurId, statut: { $in: ['ENVOYE', 'ENVOI'] }, sentAt: { $gte: new Date(Date.now() - 60 * 1000) } }),
      ctx.limiteParJour ? EmailLog.countDocuments({ organisateurId, statut: { $in: ['ENVOYE', 'ENVOI'] }, sentAt: { $gte: dayStart } }) : 0,
    ]);
    let quota = emailQuota({ sentLastMinute, sentToday, limiteParMinute: ctx.limiteParMinute, limiteParJour: ctx.limiteParJour });
    while (quota > 0 && Date.now() < deadline - 2000) {
      // eslint-disable-next-line no-await-in-loop
      const log = await EmailLog.findOneAndUpdate(
        { organisateurId, statut: 'EN_FILE', prochainEssai: { $lte: new Date() } },
        { $set: { statut: 'ENVOI', lockedUntil: new Date(Date.now() + SEND_LOCK_MS), sentAt: new Date() }, $inc: { tentatives: 1 } },
        { sort: { prochainEssai: 1, createdAt: 1 }, returnDocument: 'after' },
      );
      if (!log) break;
      quota -= 1;
      // eslint-disable-next-line no-await-in-loop
      const result = await sendOne(log, ctx);
      if (result === 'AUTH') break;
    }
  }
}

/** Event page: "120 envoyés · 45 en file (≈ 3 min) · 2 échecs", plus the SMTP alert if any. */
export async function emailSummary(event) {
  const counts = await EmailLog.aggregate([{ $match: { eventId: event._id } }, { $group: { _id: '$statut', n: { $sum: 1 } } }]);
  const by = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const ctx = await sendingSettings(event.organisateurId);
  const enFile = (by.EN_FILE || 0) + (by.ENVOI || 0);
  return {
    envoyes: by.ENVOYE || 0,
    enFile,
    echecs: by.ECHEC || 0,
    minutesRestantes: estimatedMinutes(enFile, ctx.limiteParMinute),
    limiteParMinute: ctx.limiteParMinute,
    expediteur: ctx.ownMailbox ? ctx.settings.fromEmail : 'adresse de la plateforme',
    alerteAuth: ctx.alerteAuth ? { le: ctx.alerteAuth.le, message: ctx.alerteAuth.message } : null,
  };
}

/** "Renvoyer": failed emails of the event go back to the queue. */
export async function requeueFailedEmails(event) {
  const result = await EmailLog.updateMany(
    { eventId: event._id, statut: 'ECHEC' },
    { $set: { statut: 'EN_FILE', tentatives: 0, prochainEssai: new Date(), erreur: null, erreurType: null } },
  );
  return result.modifiedCount;
}

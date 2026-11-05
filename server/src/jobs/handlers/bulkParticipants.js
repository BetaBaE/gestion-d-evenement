import { registerJobHandler } from '../jobQueue.js';
import { Job } from '../../models/Job.js';
import { Event } from '../../models/Event.js';
import { Participant } from '../../models/Participant.js';
import { Scan } from '../../models/Scan.js';
import { eligibility } from '../../services/bulkRules.js';
import { enqueueEmail } from '../../services/emailQueue.js';
import { deleteImage } from '../../services/imageService.js';
import { saveFile } from '../../services/fileStore.js';
import { participantsWorkbook } from '../../services/participantExport.js';

const FILE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Bulk actions on participants (validate, refuse, category, emails,
 * delete). Every operation is conditional / atomic so that a batch run
 * twice (resumed after a crash) never validates or emails anyone twice:
 * validation only applies to EN_ATTENTE participants, and queued emails
 * carry a dedupeKey tied to this job.
 */
async function processBulk(job, ids) {
  const { action, options = {}, userId } = job.params;
  const event = await Event.findById(job.eventId);
  const participants = await Participant.find({ _id: { $in: ids }, eventId: job.eventId });
  const byId = new Map(participants.map((p) => [String(p._id), p]));
  const scannes = action === 'SUPPRIMER' ? new Set((await Scan.distinct('participantId', { participantId: { $in: ids } })).map(String)) : null;
  const results = [];

  for (const id of ids) {
    const p = byId.get(String(id));
    if (!p) {
      results.push({ id, statut: 'ignore' }); // deleted meanwhile
      continue;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      results.push({ id, ...(await applyOne(action, p, { job, event, options, userId, scannes })) });
    } catch (error) {
      results.push({ id, statut: 'echec', erreur: `${p.prenom} ${p.nom} : ${error.message}` });
    }
  }
  return results;
}

async function applyOne(action, p, { job, event, options, userId, scannes }) {
  const dedupe = (type) => `job:${job._id}:${p._id}:${type}`;
  switch (action) {
    case 'VALIDER_ENVOYER':
    case 'VALIDER': {
      const updated = await Participant.findOneAndUpdate(
        { _id: p._id, statut: 'EN_ATTENTE' },
        { $set: { statut: 'VALIDE', validatedBy: userId, validatedAt: new Date(), validationJobId: job._id } },
        { returnDocument: 'after' },
      );
      // Already validated by this very job (batch resumed after a crash): finish its email.
      const mine = updated || (String(p.validationJobId) === String(job._id) ? p : null);
      if (!mine) return { statut: 'ignore' };
      if (action === 'VALIDER_ENVOYER') await enqueueEmail({ type: 'BADGE', participant: mine, event, dedupeKey: dedupe('BADGE') });
      return { statut: 'ok' };
    }
    case 'REFUSER': {
      const r = await Participant.updateOne({ _id: p._id, statut: { $ne: 'REFUSE' } }, { $set: { statut: 'REFUSE', validatedBy: userId, validatedAt: new Date() } });
      return { statut: r.modifiedCount ? 'ok' : 'ignore' };
    }
    case 'CHANGER_CATEGORIE': {
      const r = await Participant.updateOne({ _id: p._id, categorieId: { $ne: options.categorieId } }, { $set: { categorieId: options.categorieId } });
      return { statut: r.modifiedCount ? 'ok' : 'ignore' };
    }
    case 'RENVOYER_EMAIL': {
      if (!eligibility(action, p, { options }).ok) return { statut: 'ignore' };
      await enqueueEmail({ type: options.type, participant: p, event, dedupeKey: dedupe(options.type) });
      return { statut: 'ok' };
    }
    case 'SUPPRIMER': {
      if (!eligibility(action, p, { scannes }).ok) return { statut: 'ignore' };
      await Participant.deleteOne({ _id: p._id });
      if (p.photoImageId) await deleteImage(p.photoImageId);
      return { statut: 'ok' };
    }
    default:
      return { statut: 'echec', erreur: `Action inconnue : ${action}` };
  }
}

registerJobHandler('BULK_PARTICIPANTS', {
  batchSize: 10,
  processBatch: processBulk,
  async finalize(job) {
    const fresh = await Job.findById(job._id);
    const { action } = fresh.params;
    const emails = action === 'VALIDER_ENVOYER' || action === 'RENVOYER_EMAIL';
    const message = `${fresh.reussis} traité(s)${fresh.ignores ? `, ${fresh.ignores} ignoré(s)` : ''}${emails && fresh.reussis ? ' — emails en file d’envoi' : ''}.`;
    await Job.updateOne({ _id: job._id }, { $set: { 'resultat.message': message } });
  },
});

/** Excel export of the selection, downloaded from the Tâches panel. */
registerJobHandler('EXPORT_PARTICIPANTS', {
  batchSize: 500,
  async processBatch(job, ids) {
    return ids.map((id) => ({ id, statut: 'ok' }));
  },
  async finalize(job) {
    const participants = await Participant.find({ _id: { $in: job.items }, eventId: job.eventId }).sort({ nom: 1, prenom: 1 });
    const workbook = await participantsWorkbook(job.eventId, participants);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const expireLe = new Date(Date.now() + FILE_TTL_MS);
    const file = await saveFile(buffer, {
      filename: `participants-${new Date().toISOString().slice(0, 10)}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      expireLe,
      organisateurId: job.organisateurId,
      jobId: job._id,
    });
    await Job.updateOne({ _id: job._id }, { $set: { 'resultat.fichiers': [file], 'resultat.expireLe': expireLe, 'resultat.message': `${participants.length} participant(s) exporté(s).` } });
  },
});

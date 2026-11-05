import { getTransporter, getTestMessageUrl, isUsingEthereal } from '../config/mailer.js';
import { getOrganisateurTransporter, buildFromHeader } from './organisateurMailer.js';
import { env } from '../config/env.js';
import { Participant } from '../models/Participant.js';
import { Event } from '../models/Event.js';
import { Organisateur } from '../models/Organisateur.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { confirmationEmailTemplate, badgeEmailTemplate } from './emailTemplates.js';
import { generateQrCodeBuffer } from './qrService.js';
import { generateSingleBadgePdf } from './badgeService.js';

/**
 * Email content and delivery. Nothing calls this to send directly: emails
 * are queued (emailQueue.enqueueEmail) and the queue calls deliverEmail at
 * the organisateur's sending rate.
 */
async function resolveTransporter(organisateurId) {
  if (organisateurId) {
    const organisateurResult = await getOrganisateurTransporter(organisateurId);
    if (organisateurResult) {
      return {
        transporter: organisateurResult.transporter,
        from: buildFromHeader(organisateurResult.settings),
        replyTo: organisateurResult.settings.replyTo,
        expediteurUtilise: 'ORGANISATEUR',
      };
    }
  }
  return { transporter: await getTransporter(), from: env.mailFrom, replyTo: undefined, expediteurUtilise: 'PLATEFORME' };
}

async function buildMessage(log) {
  const participant = await Participant.findById(log.participantId);
  if (!participant) {
    const error = new Error('Participant supprimé : email annulé.');
    error.responseCode = 550; // permanent
    throw error;
  }
  const event = await Event.findById(participant.eventId);
  const [organisateur, categorie, organisme] = await Promise.all([
    Organisateur.findById(event.organisateurId),
    CategorieEvent.findById(participant.categorieId),
    InvitedOrganism.findById(participant.invitedOrganismId),
  ]);

  if (log.type === 'CONFIRMATION') {
    return {
      to: participant.email,
      subject: `Confirmation d'inscription — ${event.titre}`,
      html: confirmationEmailTemplate({ participant, event, organisateur }),
    };
  }
  const [qrBuffer, pdfBuffer] = await Promise.all([
    generateQrCodeBuffer(participant.badgeCode),
    generateSingleBadgePdf({ participant, event, categorie, organisme, organisateur }),
  ]);
  return {
    to: participant.email,
    subject: `Votre badge — ${event.titre}`,
    html: badgeEmailTemplate({ participant, event, organisateur }),
    attachments: [
      { filename: 'badge.pdf', content: pdfBuffer, contentType: 'application/pdf' },
      { filename: 'qrcode.png', content: qrBuffer, cid: 'qrcode' },
    ],
  };
}

/** Sends one queued email. Throws the transport error (classified by the queue). */
export async function deliverEmail(log) {
  const message = await buildMessage(log);
  const { transporter, from, replyTo, expediteurUtilise } = await resolveTransporter(log.organisateurId);
  const info = await transporter.sendMail({ from, replyTo, ...message });
  if (expediteurUtilise === 'PLATEFORME' && isUsingEthereal()) {
    console.log(`[email] ${log.type} to ${message.to} — preview: ${getTestMessageUrl(info)}`);
  }
  return { expediteurUtilise };
}

/** Whether emails of this organisateur go through its own mailbox (vs the platform's). */
export async function usesOrganisateurMailbox(organisateurId) {
  return !!(await getOrganisateurTransporter(organisateurId));
}

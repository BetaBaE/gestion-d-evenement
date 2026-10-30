import { getTransporter, getTestMessageUrl, isUsingEthereal } from '../config/mailer.js';
import { getOrganisateurTransporter, buildFromHeader } from './organisateurMailer.js';
import { env } from '../config/env.js';
import { EmailLog } from '../models/EmailLog.js';
import { confirmationEmailTemplate, badgeEmailTemplate } from './emailTemplates.js';
import { generateQrCodeBuffer } from './qrService.js';
import { generateSingleBadgePdf } from './badgeService.js';

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

  return {
    transporter: await getTransporter(),
    from: env.mailFrom,
    replyTo: undefined,
    expediteurUtilise: 'PLATEFORME',
  };
}

async function sendAndLog({ eventId, participantId, organisateurId, type, to, subject, html, attachments }) {
  try {
    const { transporter, from, replyTo, expediteurUtilise } = await resolveTransporter(organisateurId);
    const info = await transporter.sendMail({
      from,
      replyTo,
      to,
      subject,
      html,
      attachments,
    });

    if (expediteurUtilise === 'PLATEFORME' && isUsingEthereal()) {
      console.log(`[email] ${type} to ${to} — preview: ${getTestMessageUrl(info)}`);
    }

    await EmailLog.create({
      eventId,
      participantId,
      type,
      destinataire: to,
      statut: 'ENVOYE',
      expediteurUtilise,
    });
    return { success: true };
  } catch (error) {
    await EmailLog.create({
      eventId,
      participantId,
      type,
      destinataire: to,
      statut: 'ECHEC',
      erreur: error.message,
    });
    return { success: false, error };
  }
}

export async function sendConfirmationEmail({ participant, event, organisateur }) {
  const html = confirmationEmailTemplate({ participant, event, organisateur });
  return sendAndLog({
    eventId: event._id,
    participantId: participant._id,
    organisateurId: event.organisateurId,
    type: 'CONFIRMATION',
    to: participant.email,
    subject: `Confirmation d'inscription — ${event.titre}`,
    html,
  });
}

export async function sendBadgeEmail({ participant, event, organisateur, categorie, organisme }) {
  const html = badgeEmailTemplate({ participant, event, organisateur });
  const [qrBuffer, pdfBuffer] = await Promise.all([
    generateQrCodeBuffer(participant.badgeCode),
    generateSingleBadgePdf({ participant, event, categorie, organisme, organisateur }),
  ]);

  return sendAndLog({
    eventId: event._id,
    participantId: participant._id,
    organisateurId: event.organisateurId,
    type: 'BADGE',
    to: participant.email,
    subject: `Votre badge — ${event.titre}`,
    html,
    attachments: [
      { filename: 'badge.pdf', content: pdfBuffer, contentType: 'application/pdf' },
      { filename: 'qrcode.png', content: qrBuffer, cid: 'qrcode' },
    ],
  });
}

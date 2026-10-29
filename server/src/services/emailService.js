import { getTransporter, getTestMessageUrl, isUsingEthereal } from '../config/mailer.js';
import { env } from '../config/env.js';
import { EmailLog } from '../models/EmailLog.js';
import { confirmationEmailTemplate, badgeEmailTemplate } from './emailTemplates.js';
import { generateQrCodeBuffer } from './qrService.js';
import { generateSingleBadgePdf } from './badgeService.js';

async function sendAndLog({ eventId, participantId, type, to, subject, html, attachments }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: env.mailFrom,
      to,
      subject,
      html,
      attachments,
    });

    if (isUsingEthereal()) {
      console.log(`[email] ${type} to ${to} — preview: ${getTestMessageUrl(info)}`);
    }

    await EmailLog.create({
      eventId,
      participantId,
      type,
      destinataire: to,
      statut: 'ENVOYE',
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
    generateSingleBadgePdf({ participant, event, categorie, organisme }),
  ]);

  return sendAndLog({
    eventId: event._id,
    participantId: participant._id,
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

import { env } from '../config/env.js';

function logoUrlFor(organisateur) {
  if (!organisateur?.logoImageId) return null;
  return `${env.publicApiUrl}/images/${organisateur.logoImageId}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function baseLayout({ logoUrl, title, bodyHtml }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      ${logoUrl ? `<div style="text-align:center; margin-bottom: 16px;"><img src="${logoUrl}" alt="Logo" style="max-height: 64px;" /></div>` : ''}
      <h2 style="color: #1971c2;">${title}</h2>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #868e96;">
        Ceci est un message automatique, merci de ne pas y répondre directement.
      </p>
    </div>
  `;
}

export function confirmationEmailTemplate({ participant, event, organisateur }) {
  const title = `Confirmation d'inscription — ${event.titre}`;
  const bodyHtml = `
    <p>Bonjour ${participant.civilite || ''} ${participant.prenom} ${participant.nom},</p>
    <p>Nous avons bien reçu votre inscription à l'événement <strong>${event.titre}</strong>.</p>
    <ul>
      <li><strong>Lieu :</strong> ${event.lieu || ''} ${event.ville ? `(${event.ville})` : ''}</li>
      <li><strong>Date :</strong> du ${formatDate(event.dateDebut)} au ${formatDate(event.dateFin)}</li>
    </ul>
    <p>Votre inscription est en attente de validation par l'organisateur. Vous recevrez un email avec votre badge d'accès dès qu'elle sera validée.</p>
  `;
  return baseLayout({ logoUrl: logoUrlFor(organisateur), title, bodyHtml });
}

export function badgeEmailTemplate({ participant, event, organisateur }) {
  const title = `Votre badge — ${event.titre}`;
  const foldInstruction =
    event.badge?.format === 'A4_PLIE_4'
      ? '<p><strong>Imprimez ce badge en A4, taille réelle (100 %), puis pliez-le en 4.</strong></p>'
      : '';
  const bodyHtml = `
    <p>Bonjour ${participant.civilite || ''} ${participant.prenom} ${participant.nom},</p>
    <p>Votre inscription à l'événement <strong>${event.titre}</strong> a été validée.</p>
    <ul>
      <li><strong>Lieu :</strong> ${event.lieu || ''} ${event.ville ? `(${event.ville})` : ''}</li>
      <li><strong>Date :</strong> du ${formatDate(event.dateDebut)} au ${formatDate(event.dateFin)}</li>
    </ul>
    <p>Vous trouverez votre badge d'accès en pièce jointe. Veuillez le présenter (imprimé ou sur votre téléphone) à l'entrée de l'événement.</p>
    ${foldInstruction}
    <div style="text-align:center; margin: 24px 0;">
      <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px;" />
    </div>
  `;
  return baseLayout({ logoUrl: logoUrlFor(organisateur), title, bodyHtml });
}

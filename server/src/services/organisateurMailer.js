import nodemailer from 'nodemailer';
import { EmailSettings } from '../models/EmailSettings.js';
import { decryptSecret } from './crypto.js';

const transporterCache = new Map();

export function invalidateOrganisateurTransporter(organisateurId) {
  transporterCache.delete(organisateurId.toString());
}

/**
 * Returns { transporter, fromAddress } for the given organisateur, or null
 * if no active, working EmailSettings exist — callers fall back to the
 * platform default SMTP in that case.
 */
export async function getOrganisateurTransporter(organisateurId) {
  const key = organisateurId.toString();

  const settings = await EmailSettings.findOne({ organisateurId, actif: true }).select('+smtpPassEncrypted');
  if (!settings) {
    return null;
  }
  if (settings.dernierTestStatut === 'ECHEC') {
    return null;
  }

  if (transporterCache.has(key)) {
    return { transporter: transporterCache.get(key), settings };
  }

  const password = decryptSecret(settings.smtpPassEncrypted);
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: { user: settings.smtpUser, pass: password },
  });

  transporterCache.set(key, transporter);
  return { transporter, settings };
}

export function buildFromHeader(settings) {
  return settings.fromName ? `"${settings.fromName}" <${settings.fromEmail}>` : settings.fromEmail;
}

import { z } from 'zod';
import nodemailer from 'nodemailer';
import { EmailSettings } from '../models/EmailSettings.js';
import { encryptSecret, decryptSecret } from '../services/crypto.js';
import { invalidateOrganisateurTransporter, buildFromHeader } from '../services/organisateurMailer.js';
import { ApiError } from '../middlewares/errorHandler.js';

const settingsSchema = z.object({
  smtpHost: z.string().min(1, "L'hôte SMTP est requis."),
  smtpPort: z.number().int().positive(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().min(1, "L'utilisateur SMTP est requis."),
  smtpPass: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email('Email invalide.'),
  replyTo: z.string().email('Email invalide.').optional().or(z.literal('')),
  actif: z.boolean().optional(),
});

function toSafeJson(settings) {
  const obj = settings.toObject();
  delete obj.smtpPassEncrypted;
  obj.smtpPassConfigure = true;
  return obj;
}

export async function getEmailSettings(req, res, next) {
  try {
    const settings = await EmailSettings.findOne({ organisateurId: req.organisateurId });
    if (!settings) {
      return res.json(null);
    }
    res.json(toSafeJson(settings));
  } catch (error) {
    next(error);
  }
}

export async function upsertEmailSettings(req, res, next) {
  try {
    const data = settingsSchema.parse(req.body);
    const { smtpPass, ...rest } = data;

    const existing = await EmailSettings.findOne({ organisateurId: req.organisateurId }).select(
      '+smtpPassEncrypted',
    );

    const update = { ...rest, updatedBy: req.user.sub };

    if (smtpPass) {
      update.smtpPassEncrypted = encryptSecret(smtpPass);
    } else if (!existing) {
      throw new ApiError(400, 'Le mot de passe SMTP est requis.');
    }

    const settings = await EmailSettings.findOneAndUpdate(
      { organisateurId: req.organisateurId },
      { $set: update },
      { new: true, upsert: true, runValidators: true },
    );

    invalidateOrganisateurTransporter(req.organisateurId);

    res.json(toSafeJson(settings));
  } catch (error) {
    next(error);
  }
}

export async function testEmailSettings(req, res, next) {
  try {
    const settings = await EmailSettings.findOne({ organisateurId: req.organisateurId }).select(
      '+smtpPassEncrypted',
    );
    if (!settings) {
      throw new ApiError(404, "Aucune configuration email n'existe pour cet organisateur.");
    }

    const password = decryptSecret(settings.smtpPassEncrypted);

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser, pass: password },
    });

    try {
      await transporter.verify();
      await transporter.sendMail({
        from: buildFromHeader(settings),
        to: req.body.testRecipientEmail || settings.fromEmail,
        subject: 'Test de configuration email',
        html: '<p>Ceci est un email de test confirmant que votre configuration SMTP fonctionne correctement.</p>',
      });

      settings.dernierTestLe = new Date();
      settings.dernierTestStatut = 'OK';
      settings.dernierTestErreur = undefined;
      await settings.save();

      invalidateOrganisateurTransporter(req.organisateurId);

      res.json({ statut: 'OK' });
    } catch (testError) {
      settings.dernierTestLe = new Date();
      settings.dernierTestStatut = 'ECHEC';
      settings.dernierTestErreur = testError.message;
      await settings.save();

      res.json({ statut: 'ECHEC', erreur: testError.message });
    }
  } catch (error) {
    next(error);
  }
}

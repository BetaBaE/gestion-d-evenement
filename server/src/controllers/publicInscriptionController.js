import { z } from 'zod';
import { Event } from '../models/Event.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { Participant } from '../models/Participant.js';
import { Organisateur } from '../models/Organisateur.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { generateBadgeCode, generateToken } from '../utils/tokens.js';
import { sendConfirmationEmail } from '../services/emailService.js';
import { optimizeAndStoreImage } from '../services/imageService.js';
import { registrationClosedReason } from '../services/eventDates.js';

const participantRowSchema = z.object({
  civilite: z.enum(['M.', 'Mme']).optional(),
  nom: z.string().min(1, 'Le nom est requis.'),
  prenom: z.string().min(1, 'Le prénom est requis.'),
  fonction: z.string().min(1, 'La fonction est requise.'),
  email: z.string().email('Email invalide.'),
  telephone: z.string().optional(),
  consentementPhoto: z.boolean().optional(),
});

const submissionSchema = z.object({
  invitedOrganismId: z.string().min(1, "L'organisme est requis."),
  organismeDetails: z
    .object({
      siegeSocial: z.string().optional(),
      adresse: z.string().optional(),
      ville: z.string().optional(),
      pays: z.string().optional(),
      telephone: z.string().optional(),
      fax: z.string().optional(),
      email: z.string().optional(),
      siteWeb: z.string().optional(),
    })
    .optional(),
  participants: z.array(participantRowSchema).min(1, 'Au moins un participant est requis.'),
  honeypot: z.string().optional(),
});

async function loadValidEvent(formToken) {
  const event = await Event.findOne({ formToken });
  if (!event) {
    throw new ApiError(404, "Ce lien d'inscription n'existe pas.");
  }
  if (event.statut !== 'PUBLIE') {
    throw new ApiError(403, "Les inscriptions pour cet événement ne sont pas ouvertes.");
  }
  if (!event.inscriptionOuverte) {
    throw new ApiError(403, "Les inscriptions pour cet événement sont fermées.");
  }
  const closed = registrationClosedReason(event);
  if (closed) {
    throw new ApiError(403, closed);
  }
  return event;
}

export async function getInscriptionForm(req, res, next) {
  try {
    const event = await loadValidEvent(req.params.formToken);
    const [organismes, organisateur] = await Promise.all([
      InvitedOrganism.find({ eventId: event._id }).sort({ nom: 1 }),
      Organisateur.findById(event.organisateurId),
    ]);

    res.json({
      event: {
        titre: event.titre,
        description: event.description,
        lieu: event.lieu,
        ville: event.ville,
        dateDebut: event.dateDebut,
        dateFin: event.dateFin,
        photoObligatoire: event.photoObligatoire,
      },
      organisateur: {
        nom: organisateur?.nom,
        logoImageId: organisateur?.logoImageId,
      },
      organismes: organismes.map((o) => ({
        id: o._id,
        nom: o.nom,
        siegeSocial: o.siegeSocial,
        adresse: o.adresse,
        ville: o.ville,
        pays: o.pays,
        telephone: o.telephone,
        fax: o.fax,
        email: o.email,
        siteWeb: o.siteWeb,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function submitInscription(req, res, next) {
  try {
    const rawData = JSON.parse(req.body.data || '{}');
    const data = submissionSchema.parse(rawData);

    if (data.honeypot) {
      throw new ApiError(400, 'Requête invalide.');
    }

    const event = await loadValidEvent(req.params.formToken);

    const organisme = await InvitedOrganism.findOne({
      _id: data.invitedOrganismId,
      eventId: event._id,
    });
    if (!organisme) {
      throw new ApiError(400, "L'organisme sélectionné n'est pas invité à cet événement.");
    }

    const emails = data.participants.map((p) => p.email.toLowerCase());
    const duplicatesInSubmission = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicatesInSubmission.length > 0) {
      throw new ApiError(409, 'Un même email ne peut pas être utilisé plusieurs fois dans cette inscription.');
    }

    const existingParticipants = await Participant.find({
      eventId: event._id,
      email: { $in: emails },
    });
    if (existingParticipants.length > 0) {
      throw new ApiError(
        409,
        `L'email ${existingParticipants[0].email} est déjà inscrit à cet événement.`,
      );
    }

    const photoFiles = req.files || [];
    const photoByIndex = new Map();
    photoFiles.forEach((file) => {
      const match = file.fieldname.match(/^photo_(\d+)$/);
      if (match) {
        photoByIndex.set(Number(match[1]), file);
      }
    });

    if (event.photoObligatoire) {
      const missingPhotoIndex = data.participants.findIndex((_, index) => !photoByIndex.has(index));
      if (missingPhotoIndex !== -1) {
        throw new ApiError(400, 'Une photo est requise pour chaque participant.');
      }
      const missingConsentIndex = data.participants.findIndex((p) => !p.consentementPhoto);
      if (missingConsentIndex !== -1) {
        throw new ApiError(400, 'Le consentement pour la photo est requis.');
      }
    }

    if (data.organismeDetails) {
      const updates = {};
      for (const [key, value] of Object.entries(data.organismeDetails)) {
        if (value && !organisme[key]) {
          updates[key] = value;
        }
      }
      if (Object.keys(updates).length > 0) {
        await InvitedOrganism.updateOne({ _id: organisme._id }, updates);
      }
    }

    const defaultCategorie = await CategorieEvent.findOne({ eventId: event._id, isDefault: true });
    const organisateur = await Organisateur.findById(event.organisateurId);

    const inscriptionGroupeId = generateToken(8);
    const createdParticipants = [];

    for (let index = 0; index < data.participants.length; index += 1) {
      const row = data.participants[index];
      const photoFile = photoByIndex.get(index);

      let photoImageId;
      if (photoFile && row.consentementPhoto) {
        const image = await optimizeAndStoreImage({
          buffer: photoFile.buffer,
          type: 'PHOTO_PARTICIPANT',
          organisateurId: event.organisateurId,
          eventId: event._id,
        });
        photoImageId = image._id;
      }

      const participant = await Participant.create({
        eventId: event._id,
        invitedOrganismId: organisme._id,
        categorieId: defaultCategorie?._id,
        civilite: row.civilite,
        nom: row.nom,
        prenom: row.prenom,
        fonction: row.fonction,
        email: row.email.toLowerCase(),
        telephone: row.telephone,
        statut: 'EN_ATTENTE',
        source: 'FORMULAIRE',
        inscriptionGroupeId,
        badgeCode: generateBadgeCode(),
        createdBy: null,
        photoImageId,
        consentementPhoto: !!(photoFile && row.consentementPhoto),
        consentementPhotoLe: photoFile && row.consentementPhoto ? new Date() : undefined,
      });
      createdParticipants.push(participant);

      await sendConfirmationEmail({ participant, event, organisateur });
    }

    res.status(201).json({
      message: 'Votre inscription a bien été enregistrée.',
      count: createdParticipants.length,
    });
  } catch (error) {
    next(error);
  }
}

import { z } from 'zod';
import { Event } from '../models/Event.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { Participant } from '../models/Participant.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { generateToken } from '../utils/tokens.js';
import { optimizeAndStoreImage, deleteImage } from '../services/imageService.js';
import { generateSingleBadgePdf } from '../services/badgeService.js';
import { Organisateur } from '../models/Organisateur.js';

const badgeConfigSchema = z.object({
  largeurMm: z.number().positive().optional(),
  hauteurMm: z.number().positive().optional(),
  orientation: z.enum(['portrait', 'paysage']).optional(),
  afficherOrganisme: z.boolean().optional(),
  afficherFonction: z.boolean().optional(),
  couleurPrincipale: z.string().optional(),
  afficherLogoOrganisateur: z.boolean().optional(),
  afficherLogoOrganisme: z.boolean().optional(),
  afficherPhoto: z.boolean().optional(),
});

const eventSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis.'),
  description: z.string().optional(),
  lieu: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  dateDebut: z.coerce.date(),
  dateFin: z.coerce.date(),
  dateLimiteInscription: z.coerce.date().optional(),
  inscriptionOuverte: z.boolean().optional(),
  statut: z.enum(['BROUILLON', 'PUBLIE', 'CLOTURE', 'ARCHIVE']).optional(),
  capaciteMax: z.number().int().positive().optional(),
  banniereUrl: z.string().optional(),
  antiDoublonMinutes: z.number().int().positive().optional(),
  photoObligatoire: z.boolean().optional(),
  badgeConfig: badgeConfigSchema.optional(),
});

export const validateEvent = eventSchema;

export async function listEvents(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { organisateurId: req.organisateurId };
    const [items, total] = await Promise.all([
      Event.find(filter).sort({ dateDebut: -1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const event = await Event.create({
      ...req.body,
      organisateurId: req.organisateurId,
      formToken: generateToken(32),
      createdBy: req.user.sub,
    });

    await CategorieEvent.create({
      eventId: event._id,
      nom: 'Invité',
      couleur: '#1971c2',
      isDefault: true,
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const { badgeConfig, ...rest } = req.body;

    const update = { ...rest };
    if (badgeConfig) {
      Object.entries(badgeConfig).forEach(([key, value]) => {
        update[`badgeConfig.${key}`] = value;
      });
    }

    const event = await Event.findOneAndUpdate(
      { _id: req.params.eventId, organisateurId: req.organisateurId },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const participantCount = await Participant.countDocuments({ eventId: req.params.eventId });
    if (participantCount > 0) {
      const event = await Event.findOneAndUpdate(
        { _id: req.params.eventId, organisateurId: req.organisateurId },
        { statut: 'ARCHIVE' },
        { new: true },
      );
      if (!event) {
        throw new ApiError(404, 'Ressource introuvable');
      }
      return res.json(event);
    }

    const event = await Event.findOneAndDelete({
      _id: req.params.eventId,
      organisateurId: req.organisateurId,
    });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    await CategorieEvent.deleteMany({ eventId: event._id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function regenerateFormToken(req, res, next) {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.eventId, organisateurId: req.organisateurId },
      { formToken: generateToken(32) },
      { new: true },
    );
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function regenerateScanToken(req, res, next) {
  try {
    const { scanTokenValidFrom, scanTokenValidUntil } = req.body;
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    event.scanToken = generateToken(32);
    event.scanTokenValidFrom = scanTokenValidFrom
      ? new Date(scanTokenValidFrom)
      : new Date(new Date(event.dateDebut).setHours(0, 0, 0, 0));
    event.scanTokenValidUntil = scanTokenValidUntil
      ? new Date(scanTokenValidUntil)
      : new Date(new Date(event.dateFin).setHours(23, 59, 59, 999));
    await event.save();

    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function uploadBadgeBackground(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Une image est requise.');
    }

    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const previousFondImageId = event.badgeConfig?.fondImageId;

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'FOND_BADGE',
      organisateurId: req.organisateurId,
      eventId: event._id,
    });

    event.badgeConfig.fondImageId = image._id;
    await event.save();

    await deleteImage(previousFondImageId);

    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function deleteBadgeBackground(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    await deleteImage(event.badgeConfig?.fondImageId);
    event.badgeConfig.fondImageId = undefined;
    await event.save();

    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function previewBadge(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const [organisateur, defaultCategorie, realParticipant] = await Promise.all([
      Organisateur.findById(req.organisateurId),
      CategorieEvent.findOne({ eventId: event._id, isDefault: true }),
      Participant.findOne({ eventId: event._id, statut: 'VALIDE' }).populate('invitedOrganismId'),
    ]);

    const sampleParticipant = realParticipant || {
      nom: 'Dupont',
      prenom: 'Jean',
      fonction: 'Directeur',
      badgeCode: 'APERCU-EXEMPLE',
      photoImageId: null,
    };

    const sampleOrganisme = realParticipant?.invitedOrganismId || {
      nom: 'Organisme exemple',
      logoImageId: null,
    };

    const sampleCategorie = defaultCategorie || { nom: 'Invité', couleur: '#1971c2' };

    const pdfBuffer = await generateSingleBadgePdf({
      participant: sampleParticipant,
      event,
      categorie: sampleCategorie,
      organisme: sampleOrganisme,
      organisateur,
    });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="apercu-badge.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

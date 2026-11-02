import { z } from 'zod';
import { Event } from '../models/Event.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { Participant } from '../models/Participant.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { generateToken } from '../utils/tokens.js';
import { optimizeAndStoreImage, deleteImage } from '../services/imageService.js';
import { generateSingleBadgePdf, generateBadgeHtmlPreview } from '../services/badgeService.js';
import { Organisateur } from '../models/Organisateur.js';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale invalide.');

const horaireSchema = z.object({
  libelleJours: z.string().max(100).optional(),
  ouverture: z.string().max(10).optional(),
  fermeture: z.string().max(10).optional(),
});

const groupePartenaireSchema = z.object({
  titre: z.string().max(100).optional(),
  ordre: z.number().int().optional(),
  panneau: z.enum(['P3', 'P4', 'AUTO']).optional(),
  tailleLogos: z.enum(['S', 'M', 'L']).optional(),
  partenaires: z
    .array(
      z.object({
        partenaireId: z.string(),
        ordre: z.number().int().optional(),
      }),
    )
    .optional(),
});

const badgeConfigSchema = z.object({
  format: z.enum(['A4_PLIE_4', 'A6', 'CARTE']).optional(),
  carteLargeurMm: z.number().positive().optional(),
  carteHauteurMm: z.number().positive().optional(),
  panneauxActifs: z
    .object({
      p2: z.boolean().optional(),
      p3: z.boolean().optional(),
      p4: z.boolean().optional(),
    })
    .optional(),
  rotationLigneBas180: z.boolean().optional(),
  traitsDePliage: z.boolean().optional(),
  afficherPhoto: z.boolean().optional(),
  theme: z
    .object({
      couleurPrincipale: hexColor.optional(),
      couleurSecondaire: hexColor.optional(),
      couleurAccent: hexColor.optional(),
      couleurTexte: hexColor.optional(),
      degradeEntete: z.boolean().optional(),
      policeTitres: z.string().max(60).optional(),
      policeTexte: z.string().max(60).optional(),
      policeNom: z.string().max(60).optional(),
    })
    .optional(),
  entete: z
    .object({
      modeImage: z.boolean().optional(),
      patronageAr: z.string().max(300).optional(),
      patronageFr: z.string().max(300).optional(),
      titreAffiche: z.string().max(300).optional(),
      sousTitreParLigne: z.string().max(300).optional(),
      edition: z.string().max(300).optional(),
      descriptif: z.string().max(300).optional(),
    })
    .optional(),
  siteWeb: z.string().max(300).optional(),
  reseauxSociaux: z
    .object({
      facebook: z.string().max(300).optional(),
      instagram: z.string().max(300).optional(),
      linkedin: z.string().max(300).optional(),
      youtube: z.string().max(300).optional(),
      x: z.string().max(300).optional(),
    })
    .optional(),
  infosPratiques: z
    .object({
      messageValidite: z.string().max(300).optional(),
      horaires: z.array(horaireSchema).optional(),
      lieuNom: z.string().max(300).optional(),
      lieuDetail: z.string().max(300).optional(),
      droitsEntree: z.string().max(300).optional(),
      venirAuSalon: z.string().max(300).optional(),
      noteEncadree: z
        .object({
          texte: z.string().max(300).optional(),
          lien: z.string().max(300).optional(),
        })
        .optional(),
      afficherOrganisateur: z.boolean().optional(),
    })
    .optional(),
  groupesPartenaires: z.array(groupePartenaireSchema).optional(),
  encartPromo: z
    .object({
      actif: z.boolean().optional(),
      titre: z.string().max(300).optional(),
      pastille: z.string().max(20).optional(),
      texte: z.string().max(300).optional(),
      couleur: hexColor.optional(),
      partenaireId: z.string().optional(),
    })
    .optional(),
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

export async function uploadBadgeBanniere(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Une image est requise.');
    }

    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const previousId = event.badgeConfig?.entete?.banniereImageId;

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'BANNIERE_BADGE',
      organisateurId: req.organisateurId,
      eventId: event._id,
    });

    event.badgeConfig.entete.banniereImageId = image._id;
    await event.save();

    await deleteImage(previousId);

    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function deleteBadgeBanniere(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    await deleteImage(event.badgeConfig?.entete?.banniereImageId);
    event.badgeConfig.entete.banniereImageId = undefined;
    await event.save();

    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function uploadBadgeLogoEvenement(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Une image est requise.');
    }

    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const previousId = event.badgeConfig?.entete?.logoEvenementImageId;

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'LOGO_EVENEMENT',
      organisateurId: req.organisateurId,
      eventId: event._id,
    });

    event.badgeConfig.entete.logoEvenementImageId = image._id;
    await event.save();

    await deleteImage(previousId);

    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function deleteBadgeLogoEvenement(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    await deleteImage(event.badgeConfig?.entete?.logoEvenementImageId);
    event.badgeConfig.entete.logoEvenementImageId = undefined;
    await event.save();

    res.json(event);
  } catch (error) {
    next(error);
  }
}

async function loadPreviewSample(event, organisateurId) {
  const [organisateur, defaultCategorie, realParticipant] = await Promise.all([
    Organisateur.findById(organisateurId),
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

  return {
    participant: sampleParticipant,
    event,
    categorie: sampleCategorie,
    organisme: sampleOrganisme,
    organisateur,
  };
}

export async function previewBadge(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const sample = await loadPreviewSample(event, req.organisateurId);
    const pdfBuffer = await generateSingleBadgePdf(sample);

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="apercu-badge.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function previewBadgeHtml(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const sample = await loadPreviewSample(event, req.organisateurId);
    const html = await generateBadgeHtmlPreview(sample);

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
}

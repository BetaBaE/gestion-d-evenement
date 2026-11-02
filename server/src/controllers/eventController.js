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
import { BUILTIN_TEMPLATES, hasBlockType, getBlockDefinition } from '../../../shared/badge-renderer/index.js';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale invalide.');

// Badge content (panneaux.P1-P4.blocs) is edited via the dedicated
// getBadgeContenu/updateBadgeContenu endpoints (the drag-and-drop builder,
// Addendum 3 phase 6b) or set wholesale by applying a built-in template
// (applyBadgeTemplate). Only format/dimensions/folding/theme stay editable
// through the regular updateEvent endpoint.
const badgeConfigSchema = z.object({
  format: z.enum(['A4_PLIE_4', 'A6', 'CARTE']).optional(),
  carteLargeurMm: z.number().positive().optional(),
  carteHauteurMm: z.number().positive().optional(),
  rotationLigneBas180: z.boolean().optional(),
  traitsDePliage: z.boolean().optional(),
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

// Images now attach to a specific block's props (e.g. enteteEvenement's
// banniereImageId/logoImageId) rather than a fixed badgeConfig field, since
// content is a list of blocks per panel (Addendum 3). Finds the first block
// of the given type across all panels and returns { bloc } so callers can
// mutate bloc.props directly before event.save().
function findFirstBlockByType(event, blockType) {
  for (const panelKey of ['P1', 'P2', 'P3', 'P4']) {
    const panneau = event.badgeConfig?.panneaux?.[panelKey];
    const bloc = (panneau?.blocs || []).find((b) => b.type === blockType);
    if (bloc) return bloc;
  }
  return null;
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

    const bloc = findFirstBlockByType(event, 'enteteEvenement');
    if (!bloc) {
      throw new ApiError(400, "Ce badge n'a pas de bloc d'en-tête. Appliquez un modèle d'abord.");
    }

    const previousId = bloc.props?.banniereImageId;

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'BANNIERE_BADGE',
      organisateurId: req.organisateurId,
      eventId: event._id,
    });

    bloc.props.banniereImageId = image._id;
    event.markModified('badgeConfig.panneaux');
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

    const bloc = findFirstBlockByType(event, 'enteteEvenement');
    if (bloc) {
      await deleteImage(bloc.props?.banniereImageId);
      bloc.props.banniereImageId = undefined;
      event.markModified('badgeConfig.panneaux');
      await event.save();
    }

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

    const bloc = findFirstBlockByType(event, 'enteteEvenement');
    if (!bloc) {
      throw new ApiError(400, "Ce badge n'a pas de bloc d'en-tête. Appliquez un modèle d'abord.");
    }

    const previousId = bloc.props?.logoImageId;

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'LOGO_EVENEMENT',
      organisateurId: req.organisateurId,
      eventId: event._id,
    });

    bloc.props.logoImageId = image._id;
    event.markModified('badgeConfig.panneaux');
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

    const bloc = findFirstBlockByType(event, 'enteteEvenement');
    if (bloc) {
      await deleteImage(bloc.props?.logoImageId);
      bloc.props.logoImageId = undefined;
      event.markModified('badgeConfig.panneaux');
      await event.save();
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function applyBadgeTemplate(req, res, next) {
  try {
    const { templateKey } = z.object({ templateKey: z.enum(Object.keys(BUILTIN_TEMPLATES)) }).parse(req.body);

    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const built = BUILTIN_TEMPLATES[templateKey].build();
    event.badgeConfig.format = built.format;
    event.badgeConfig.carteLargeurMm = built.carteLargeurMm ?? event.badgeConfig.carteLargeurMm;
    event.badgeConfig.carteHauteurMm = built.carteHauteurMm ?? event.badgeConfig.carteHauteurMm;
    event.badgeConfig.rotationLigneBas180 = built.rotationLigneBas180 ?? false;
    event.badgeConfig.traitsDePliage = built.traitsDePliage ?? true;
    event.badgeConfig.panneaux = built.panneaux;
    event.markModified('badgeConfig');
    await event.save();

    res.json(event);
  } catch (error) {
    next(error);
  }
}

const PANEL_KEYS = ['P1', 'P2', 'P3', 'P4'];

const blocSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()).optional().default({}),
  style: z
    .object({
      alignement: z.enum(['gauche', 'centre', 'droite']).optional(),
      margeHaut: z.enum(['aucune', 'S', 'M', 'L']).optional(),
      margeBas: z.enum(['aucune', 'S', 'M', 'L']).optional(),
      couleurFond: z.enum(['aucune', 'principale', 'secondaire', 'accent']).optional(),
      couleurTexte: z.enum(['auto', 'principale', 'accent', 'texte', 'blanc']).optional(),
      taille: z.enum(['S', 'M', 'L', 'XL']).optional(),
    })
    .optional()
    .default({}),
});

const panneauContenuSchema = z.object({
  actif: z.boolean().optional(),
  blocs: z.array(blocSchema),
});

const panneauxContenuSchema = z.object({
  P1: panneauContenuSchema,
  P2: panneauContenuSchema,
  P3: panneauContenuSchema,
  P4: panneauContenuSchema,
});

export async function getBadgeContenu(req, res, next) {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json({ panneaux: event.badgeConfig.panneaux, theme: event.badgeConfig.theme, format: event.badgeConfig.format });
  } catch (error) {
    next(error);
  }
}

export async function updateBadgeContenu(req, res, next) {
  try {
    const { panneaux } = z.object({ panneaux: panneauxContenuSchema }).parse(req.body);

    const errors = [];
    PANEL_KEYS.forEach((key) => {
      panneaux[key].blocs.forEach((bloc, index) => {
        if (!hasBlockType(bloc.type)) {
          errors.push(`${key}[${index}]: type de bloc inconnu "${bloc.type}"`);
          return;
        }
        const result = getBlockDefinition(bloc.type).validateProps(bloc.props);
        if (!result.valid) {
          errors.push(`${key}[${index}] (${bloc.type}): ${result.errors.join(', ')}`);
        }
      });
    });
    if (errors.length > 0) {
      throw new ApiError(400, 'Contenu de badge invalide.', errors);
    }

    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    event.badgeConfig.panneaux = panneaux;
    event.markModified('badgeConfig.panneaux');
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

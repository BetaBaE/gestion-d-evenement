import { z } from 'zod';
import { Event } from '../models/Event.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { Participant } from '../models/Participant.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { generateToken } from '../utils/tokens.js';
import { generateSingleBadgePdf, generateBadgeHtmlPreview } from '../services/badgeService.js';
import { Organisateur } from '../models/Organisateur.js';
import { ModeleBadge } from '../models/ModeleBadge.js';
import { STARTER_TEMPLATES } from '../../../shared/badge-renderer/index.js';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale invalide.');

// Badge elements are only set by applying a template (applyBadgeTemplate)
// until the editor lands (Addendum 3 v2 phase 6b). Only folding options
// and theme colors stay editable through the regular updateEvent endpoint.
const badgeSchema = z.object({
  rotationLigneBas180: z.boolean().optional(),
  traitsDePliage: z.boolean().optional(),
  theme: z
    .object({
      couleurPrincipale: hexColor.optional(),
      couleurSecondaire: hexColor.optional(),
      couleurAccent: hexColor.optional(),
      couleurTexte: hexColor.optional(),
      policeTitres: z.string().max(60).optional(),
      policeTexte: z.string().max(60).optional(),
      policeNom: z.string().max(60).optional(),
    })
    .optional(),
});

const BADGE_TEMPLATE_FIELDS = [
  'format',
  'carteLargeurMm',
  'carteHauteurMm',
  'rotationLigneBas180',
  'traitsDePliage',
  'safeZoneMm',
  'theme',
  'elements',
];

function badgeFromTemplate(template, { modeleSourceId = null, modeleSourceVersion = null } = {}) {
  const badge = { modeleSourceId, modeleSourceVersion, version: 1, publieLe: new Date() };
  BADGE_TEMPLATE_FIELDS.forEach((field) => {
    if (template[field] !== undefined) badge[field] = structuredClone(template[field]);
  });
  return badge;
}

async function defaultBadgeForOrganisateur(organisateurId) {
  const modele = await ModeleBadge.findOne({ organisateurId, parDefaut: true, archive: { $ne: true } }).lean();
  if (modele) {
    return badgeFromTemplate(modele, { modeleSourceId: modele._id, modeleSourceVersion: modele.version });
  }
  return badgeFromTemplate(STARTER_TEMPLATES.SALON_A4_PLIE_4.build());
}

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
  badge: badgeSchema.optional(),
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
    const { badge: _ignoredBadge, ...fields } = req.body;
    const event = await Event.create({
      ...fields,
      organisateurId: req.organisateurId,
      formToken: generateToken(32),
      createdBy: req.user.sub,
      badge: await defaultBadgeForOrganisateur(req.organisateurId),
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
    const { badge, ...rest } = req.body;

    // Dot-path keys so a partial badge update merges into the existing
    // sub-document instead of replacing it (and wiping its elements).
    const update = { ...rest };
    if (badge) {
      Object.entries(badge).forEach(([key, value]) => {
        if (key === 'theme' && value) {
          Object.entries(value).forEach(([themeKey, themeValue]) => {
            update[`badge.theme.${themeKey}`] = themeValue;
          });
        } else {
          update[`badge.${key}`] = value;
        }
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

/**
 * Lists everything that can be applied to an event's badge: the read-only
 * starter templates defined in code, plus this organisateur's own
 * (non-archived) ModeleBadge templates.
 */
export async function listBadgeTemplates(req, res, next) {
  try {
    const modeles = await ModeleBadge.find({ organisateurId: req.organisateurId, archive: { $ne: true } })
      .sort({ nom: 1 })
      .select('nom description format parDefaut version');

    res.json({
      starters: Object.entries(STARTER_TEMPLATES).map(([key, t]) => ({ key, nom: t.label })),
      modeles,
    });
  } catch (error) {
    next(error);
  }
}

const applyTemplateSchema = z.union([
  z.object({ starterKey: z.enum(Object.keys(STARTER_TEMPLATES)) }),
  z.object({ modeleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant de modèle invalide.') }),
]);

/**
 * Copies a template into Event.badge (Addendum 3 v2 §2.1). It's a copy, not
 * a reference: later edits to the template never change this event's badge
 * automatically.
 */
export async function applyBadgeTemplate(req, res, next) {
  try {
    const body = applyTemplateSchema.parse(req.body);

    const event = await Event.findOne({ _id: req.params.eventId, organisateurId: req.organisateurId });
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    let badge;
    if (body.starterKey) {
      badge = badgeFromTemplate(STARTER_TEMPLATES[body.starterKey].build());
    } else {
      const modele = await ModeleBadge.findOne({
        _id: body.modeleId,
        organisateurId: req.organisateurId,
        archive: { $ne: true },
      }).lean();
      if (!modele) {
        throw new ApiError(404, 'Modèle de badge introuvable.');
      }
      badge = badgeFromTemplate(modele, { modeleSourceId: modele._id, modeleSourceVersion: modele.version });
    }

    badge.version = (event.badge?.version || 0) + 1;
    event.badge = badge;
    event.markModified('badge');
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
    // Helmet's default CSP blocks inline scripts, which would stop the
    // text-fitting pass injected into this page. Override for this response
    // only: no network access at all, inline scripts/styles and data: images
    // allowed (all user text in the page is HTML-escaped by the renderer).
    res.set(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:",
    );
    res.send(html);
  } catch (error) {
    next(error);
  }
}

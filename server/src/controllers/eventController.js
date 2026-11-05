import { z } from 'zod';
import { Event } from '../models/Event.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { Participant } from '../models/Participant.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { generateToken } from '../utils/tokens.js';
import { Scan } from '../models/Scan.js';
import { describeScanLink } from '../services/scanAccess.js';
import { resolveCategoryNames } from '../services/templateTransfer.js';
import { eventDatesError } from '../services/eventDates.js';
import { MODES_VALIDATION } from '../services/validationRules.js';
import { generateSingleBadgePdf, generateBadgeHtmlPreview } from '../services/badgeService.js';
import { Organisateur } from '../models/Organisateur.js';
import { ModeleBadge } from '../models/ModeleBadge.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Partenaire } from '../models/Partenaire.js';
import { STARTER_TEMPLATES, checkBadgeRules } from '../../../shared/badge-renderer/index.js';
import { elementSchema, themeSchema, validateElementTypes } from '../validation/badgeElements.js';

// Badge elements are set by applying a template (applyBadgeTemplate) or by
// the editor (updateEventBadge). Only folding options and theme colors are
// editable through the regular updateEvent endpoint.
const badgeSchema = z.object({
  rotationLigneBas180: z.boolean().optional(),
  traitsDePliage: z.boolean().optional(),
  theme: themeSchema.optional(),
});

const BADGE_TEMPLATE_FIELDS = [
  'format',
  'carteLargeurMm',
  'carteHauteurMm',
  'rotationLigneBas180',
  'traitsDePliage',
  'safeZoneMm',
  'panneauxActifs',
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
  validation: z
    .object({
      mode: z.enum(MODES_VALIDATION),
      categorieIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).default([]),
      organismeIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).default([]),
    })
    .optional(),
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

// Optional fields the form can empty. validateBody strips nulls (most
// optional fields just mean "not provided"), so without this a deadline
// or a capacity, once set, could never be removed.
const CLEARABLE_FIELDS = ['dateLimiteInscription', 'capaciteMax'];

/** Express middleware (before validateBody): remembers fields sent as null / "". */
export function rememberClearedFields(req, res, next) {
  req.clearedFields = CLEARABLE_FIELDS.filter((key) => key in (req.body || {}) && (req.body[key] === null || req.body[key] === ''));
  next();
}

export async function createEvent(req, res, next) {
  try {
    const { badge: _ignoredBadge, ...fields } = req.body;
    const datesError = eventDatesError(fields);
    if (datesError) {
      throw new ApiError(400, datesError);
    }
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
    const cleared = req.clearedFields || [];

    // Check the dates as they will be after this update.
    const datesError = eventDatesError({
      dateDebut: rest.dateDebut ?? req.event.dateDebut,
      dateFin: rest.dateFin ?? req.event.dateFin,
      dateLimiteInscription: cleared.includes('dateLimiteInscription') ? null : rest.dateLimiteInscription ?? req.event.dateLimiteInscription,
    });
    if (datesError) {
      throw new ApiError(400, datesError);
    }

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
      cleared.length ? { $set: update, $unset: Object.fromEntries(cleared.map((k) => [k, ''])) } : { $set: update },
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

/**
 * New scan link. Only the token changes: in AUTO mode the window keeps
 * following the event dates, in MANUEL mode the stored window is kept.
 */
export async function regenerateScanToken(req, res, next) {
  try {
    const event = req.event;
    event.scanToken = generateToken(32);
    await event.save();
    res.json(event);
  } catch (error) {
    next(error);
  }
}

/** Live status of the scan link for the Scan tab. */
export async function getScanStatus(req, res, next) {
  try {
    const nbScansTest = await Scan.countDocuments({ eventId: req.event._id, test: true });
    res.json({ ...describeScanLink(req.event), nbScansTest });
  } catch (error) {
    next(error);
  }
}

const scanConfigSchema = z
  .object({
    scanWindowMode: z.enum(['AUTO', 'MANUEL']),
    scanTokenValidFrom: z.coerce.date().optional(),
    scanTokenValidUntil: z.coerce.date().optional(),
  })
  .refine((v) => v.scanWindowMode === 'AUTO' || (v.scanTokenValidFrom && v.scanTokenValidUntil), {
    message: 'Indiquez le début et la fin de la fenêtre de scan.',
  })
  .refine((v) => v.scanWindowMode === 'AUTO' || v.scanTokenValidUntil > v.scanTokenValidFrom, {
    message: 'La fin de la fenêtre doit être après son début.',
  });

export const validateScanConfig = scanConfigSchema;

/** Switches between AUTO (follows the dates) and MANUEL (explicit window). */
export async function updateScanConfig(req, res, next) {
  try {
    const event = req.event;
    event.scanWindowMode = req.body.scanWindowMode;
    if (req.body.scanWindowMode === 'MANUEL') {
      event.scanTokenValidFrom = req.body.scanTokenValidFrom;
      event.scanTokenValidUntil = req.body.scanTokenValidUntil;
    }
    await event.save();
    res.json(describeScanLink(event));
  } catch (error) {
    next(error);
  }
}

const scanTestSchema = z.object({ heures: z.union([z.literal(1), z.literal(2), z.literal(8)]) });
export const validateScanTest = scanTestSchema;

/** Test mode: the link works outside its window for 1, 2 or 8 hours. */
export async function startScanTest(req, res, next) {
  try {
    const event = req.event;
    event.scanTestJusquA = new Date(Date.now() + req.body.heures * 3600 * 1000);
    await event.save();
    res.json(describeScanLink(event));
  } catch (error) {
    next(error);
  }
}

export async function stopScanTest(req, res, next) {
  try {
    const event = req.event;
    event.scanTestJusquA = undefined;
    await event.save();
    res.json(describeScanLink(event));
  } catch (error) {
    next(error);
  }
}

export async function purgeTestScans(req, res, next) {
  try {
    const { deletedCount } = await Scan.deleteMany({ eventId: req.event._id, test: true });
    res.json({ deleted: deletedCount });
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
/**
 * Everything the badge editor needs besides the event itself, in one call:
 * organisateur branding (the organisateur endpoint is Super Admin only, so
 * a Gestionnaire couldn't load it), the event's categories (for
 * "visible si" and previews), invited organismes and the partner library.
 */
export async function getBadgeEditorContext(req, res, next) {
  try {
    const [organisateur, categories, organismes, partenaires] = await Promise.all([
      Organisateur.findById(req.organisateurId).select('nom siteWeb logoImageId brandKit'),
      CategorieEvent.find({ eventId: req.event._id }).select('nom couleur isDefault').sort({ nom: 1 }),
      InvitedOrganism.find({ eventId: req.event._id }).select('nom logoImageId').sort({ nom: 1 }),
      Partenaire.find({ organisateurId: req.organisateurId, actif: { $ne: false } }).select('nom logoImageId').sort({ nom: 1 }),
    ]);
    res.json({ organisateur, categories, organismes, partenaires });
  } catch (error) {
    next(error);
  }
}

const editorBadgeSchema = z.object({
  elements: z.array(elementSchema).max(300),
  theme: themeSchema.optional(),
});

/**
 * Editor autosave target (Addendum 3 v2 phase 6b). Replaces the event's
 * badge elements wholesale. Phase 6c moves this onto a separate draft
 * (badgeBrouillon) with an explicit publish step.
 */
export async function updateEventBadge(req, res, next) {
  try {
    const { elements, theme } = editorBadgeSchema.parse(req.body);
    const errors = validateElementTypes(elements);
    if (errors.length > 0) {
      throw new ApiError(400, 'Badge invalide.', errors);
    }

    const update = { 'badge.elements': elements, 'badge.publieLe': new Date() };
    if (theme) {
      Object.entries(theme).forEach(([key, value]) => {
        update[`badge.theme.${key}`] = value;
      });
    }

    const event = await Event.findOneAndUpdate(
      { _id: req.params.eventId, organisateurId: req.organisateurId },
      { $set: update, $inc: { 'badge.version': 1 } },
      { new: true, runValidators: true },
    );
    if (!event) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json({ badge: event.badge });
  } catch (error) {
    next(error);
  }
}

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
      // A template can be saved with errors (draft), but not used for an event.
      const bloquants = checkBadgeRules(modele).filter((r) => r.niveau === 'bloquant');
      if (bloquants.length > 0) {
        throw new ApiError(409, `Ce modèle n'est pas prêt : ${bloquants.map((r) => r.message.toLowerCase()).join(', ')}.`, {
          regles: bloquants,
        });
      }
      badge = badgeFromTemplate(modele, { modeleSourceId: modele._id, modeleSourceVersion: modele.version });
      // Imported templates name their "visible si" categories: match this event's.
      badge.elements = await resolveCategoryNames(badge.elements, event._id);
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

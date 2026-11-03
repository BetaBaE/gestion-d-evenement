import { z } from 'zod';
import { ModeleBadge } from '../models/ModeleBadge.js';
import { Organisateur } from '../models/Organisateur.js';
import { Partenaire } from '../models/Partenaire.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { elementSchema, themeSchema, validateElementTypes } from '../validation/badgeElements.js';
import { STARTER_TEMPLATES } from '../../../shared/badge-renderer/index.js';
import { generateSingleBadgePdf } from '../services/badgeService.js';

// "Personnalisé" is a single-panel card with free dimensions, within what
// fits on an A4 sheet.
export const CARTE_LIMITES_MM = { largeur: { min: 40, max: 210 }, hauteur: { min: 40, max: 297 } };

const modeleBadgeSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis.'),
  description: z.string().optional(),
  format: z.enum(['A4_PLIE_4', 'A6', 'CARTE']).optional(),
  carteLargeurMm: z
    .number()
    .min(CARTE_LIMITES_MM.largeur.min, `Largeur minimale ${CARTE_LIMITES_MM.largeur.min} mm.`)
    .max(CARTE_LIMITES_MM.largeur.max, `Largeur maximale ${CARTE_LIMITES_MM.largeur.max} mm.`)
    .optional(),
  carteHauteurMm: z
    .number()
    .min(CARTE_LIMITES_MM.hauteur.min, `Hauteur minimale ${CARTE_LIMITES_MM.hauteur.min} mm.`)
    .max(CARTE_LIMITES_MM.hauteur.max, `Hauteur maximale ${CARTE_LIMITES_MM.hauteur.max} mm.`)
    .optional(),
  rotationLigneBas180: z.boolean().optional(),
  traitsDePliage: z.boolean().optional(),
  safeZoneMm: z.number().min(3).max(8).optional(),
  panneauxActifs: z.array(z.enum(['P1', 'P2', 'P3', 'P4'])).optional(),
  theme: themeSchema.optional(),
  elements: z.array(elementSchema).optional(),
});

export const validateModeleBadge = modeleBadgeSchema;

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide.');

// "Nouveau modèle": from a blank page, a starter template, or a copy of one
// of the organisateur's templates.
const createModeleSchema = modeleBadgeSchema
  .extend({
    depart: z.enum(['VIERGE', 'STARTER', 'DUPLIQUER']).default('VIERGE'),
    starterKey: z.string().optional(),
    sourceModeleId: objectId.optional(),
  })
  .refine((v) => v.depart !== 'STARTER' || (v.starterKey && STARTER_TEMPLATES[v.starterKey]), {
    message: 'Choisissez un modèle de départ.',
    path: ['starterKey'],
  })
  .refine((v) => v.depart !== 'DUPLIQUER' || v.sourceModeleId, {
    message: 'Choisissez le modèle à dupliquer.',
    path: ['sourceModeleId'],
  });

export const validateCreateModeleBadge = createModeleSchema;

const COPIED_FIELDS = [
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

function pick(source, fields) {
  const out = {};
  fields.forEach((f) => {
    if (source[f] !== undefined && source[f] !== null) out[f] = structuredClone(source[f]);
  });
  return out;
}

/** Theme of a blank template: the organisateur's brand kit, where set. */
export function themeFromBrandKit(brandKit) {
  const c = brandKit?.couleurs || {};
  const p = brandKit?.polices || {};
  const theme = {
    couleurPrincipale: c.principale,
    couleurSecondaire: c.secondaire,
    couleurAccent: c.accent,
    couleurTexte: c.texte,
    policeTitres: p.titres,
    policeTexte: p.texte,
    policeNom: p.nom,
  };
  return Object.fromEntries(Object.entries(theme).filter(([, v]) => v));
}

export async function listModelesBadge(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { organisateurId: req.organisateurId, archive: { $ne: true } };
    const [items, total] = await Promise.all([
      ModeleBadge.find(filter).sort({ nom: 1 }).skip(skip).limit(limit).select('-elements'),
      ModeleBadge.countDocuments(filter),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getModeleBadge(req, res, next) {
  try {
    const modele = await ModeleBadge.findOne({ _id: req.params.modeleId, organisateurId: req.organisateurId });
    if (!modele) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(modele);
  } catch (error) {
    next(error);
  }
}

export async function createModeleBadge(req, res, next) {
  try {
    const { depart, starterKey, sourceModeleId, ...data } = createModeleSchema.parse(req.body);

    let base = {};
    if (depart === 'STARTER') {
      base = pick(STARTER_TEMPLATES[starterKey].build(), COPIED_FIELDS);
    } else if (depart === 'DUPLIQUER') {
      const source = await ModeleBadge.findOne({ _id: sourceModeleId, organisateurId: req.organisateurId }).lean();
      if (!source) {
        throw new ApiError(404, 'Modèle à dupliquer introuvable.');
      }
      base = pick(source, COPIED_FIELDS);
    } else {
      // Blank page: no elements, the organisateur's brand kit as theme.
      const organisateur = await Organisateur.findById(req.organisateurId).select('brandKit').lean();
      base = { elements: [], theme: themeFromBrandKit(organisateur?.brandKit) };
    }

    // The format chosen in the dialog only applies to a blank page; a starter
    // or a copy keeps its own layout.
    const layout = depart === 'VIERGE' ? pick(data, ['format', 'carteLargeurMm', 'carteHauteurMm', 'panneauxActifs']) : {};
    const modeleData = { ...base, ...layout, nom: data.nom, description: data.description };

    const errors = validateElementTypes(modeleData.elements);
    if (errors.length > 0) {
      throw new ApiError(400, 'Modèle de badge invalide.', errors);
    }

    const modele = await ModeleBadge.create({
      ...modeleData,
      organisateurId: req.organisateurId,
      createdBy: req.user.sub,
      updatedBy: req.user.sub,
    });
    res.status(201).json(modele);
  } catch (error) {
    next(error);
  }
}

/** What the badge editor needs to edit a template: branding and partner library. */
export async function getModeleEditorContext(req, res, next) {
  try {
    const [organisateur, partenaires] = await Promise.all([
      Organisateur.findById(req.organisateurId).select('nom siteWeb logoImageId brandKit'),
      Partenaire.find({ organisateurId: req.organisateurId, actif: { $ne: false } }).select('nom logoImageId').sort({ nom: 1 }),
    ]);
    res.json({ organisateur, categories: [], organismes: [], partenaires });
  } catch (error) {
    next(error);
  }
}

/** PDF preview of a template with sample event and participant data. */
export async function previewModeleBadge(req, res, next) {
  try {
    const modele = await ModeleBadge.findOne({ _id: req.params.modeleId, organisateurId: req.organisateurId }).lean();
    if (!modele) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    const organisateur = await Organisateur.findById(req.organisateurId);
    const now = new Date();
    const pdf = await generateSingleBadgePdf({
      participant: { nom: 'Dupont', prenom: 'Jean', fonction: 'Directeur commercial', badgeCode: 'APERCU-MODELE', photoImageId: null },
      event: {
        titre: 'Événement exemple',
        lieu: 'Palais des congrès',
        ville: 'Casablanca',
        dateDebut: now,
        dateFin: now,
        badge: modele,
      },
      categorie: { nom: 'Invité', couleur: modele.theme?.couleurPrincipale || '#1971c2' },
      organisme: { nom: 'Organisme exemple', logoImageId: null },
      organisateur,
    });
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="apercu-modele.pdf"');
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

export async function updateModeleBadge(req, res, next) {
  try {
    const data = modeleBadgeSchema.partial().parse(req.body);
    if (data.elements) {
      const errors = validateElementTypes(data.elements);
      if (errors.length > 0) {
        throw new ApiError(400, 'Modèle de badge invalide.', errors);
      }
    }

    const modele = await ModeleBadge.findOneAndUpdate(
      { _id: req.params.modeleId, organisateurId: req.organisateurId },
      { $set: { ...data, updatedBy: req.user.sub }, $inc: { version: 1 } },
      { new: true, runValidators: true },
    );
    if (!modele) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(modele);
  } catch (error) {
    next(error);
  }
}

/**
 * Marks one template as the organisateur's default (applied automatically
 * to newly created events) and clears the flag on all the others, so there
 * is never more than one default per organisateur.
 */
export async function setDefaultModeleBadge(req, res, next) {
  try {
    const modele = await ModeleBadge.findOne({
      _id: req.params.modeleId,
      organisateurId: req.organisateurId,
      archive: { $ne: true },
    });
    if (!modele) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    await ModeleBadge.updateMany(
      { organisateurId: req.organisateurId, _id: { $ne: modele._id }, parDefaut: true },
      { $set: { parDefaut: false } },
    );
    modele.parDefaut = true;
    modele.updatedBy = req.user.sub;
    await modele.save();

    res.json(modele);
  } catch (error) {
    next(error);
  }
}

export async function deleteModeleBadge(req, res, next) {
  try {
    // Deleting a template used by an event is only allowed as an archive
    // (Addendum 3 v2 §2.1) — events keep their own copy (Event.badge) so
    // this never breaks a published badge either way, but we still avoid
    // a hard delete so the template stays discoverable for restoring.
    const modele = await ModeleBadge.findOneAndUpdate(
      { _id: req.params.modeleId, organisateurId: req.organisateurId },
      { $set: { archive: true, parDefaut: false, updatedBy: req.user.sub } },
      { new: true },
    );
    if (!modele) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

import { z } from 'zod';
import { ModeleBadge } from '../models/ModeleBadge.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { elementSchema, themeSchema, validateElementTypes } from '../validation/badgeElements.js';

const modeleBadgeSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  description: z.string().optional(),
  format: z.enum(['A4_PLIE_4', 'A6', 'CARTE']).optional(),
  carteLargeurMm: z.number().positive().optional(),
  carteHauteurMm: z.number().positive().optional(),
  rotationLigneBas180: z.boolean().optional(),
  traitsDePliage: z.boolean().optional(),
  safeZoneMm: z.number().min(3).max(8).optional(),
  theme: themeSchema.optional(),
  elements: z.array(elementSchema).optional(),
});

export const validateModeleBadge = modeleBadgeSchema;

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
    const data = modeleBadgeSchema.parse(req.body);
    const errors = validateElementTypes(data.elements);
    if (errors.length > 0) {
      throw new ApiError(400, 'Modèle de badge invalide.', errors);
    }

    const modele = await ModeleBadge.create({
      ...data,
      organisateurId: req.organisateurId,
      createdBy: req.user.sub,
      updatedBy: req.user.sub,
    });
    res.status(201).json(modele);
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

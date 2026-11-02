import { z } from 'zod';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { Participant } from '../models/Participant.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { hexColor } from '../validation/badgeElements.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const categorieSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  couleur: hexColor.optional(),
  description: z.string().optional(),
});

export const validateCategorie = categorieSchema;

export async function listCategories(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { eventId: req.event._id };
    const [items, total] = await Promise.all([
      CategorieEvent.find(filter).sort({ isDefault: -1, nom: 1 }).skip(skip).limit(limit),
      CategorieEvent.countDocuments(filter),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getCategorie(req, res, next) {
  try {
    const categorie = await CategorieEvent.findOne({ _id: req.params.categorieId, eventId: req.event._id });
    if (!categorie) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(categorie);
  } catch (error) {
    next(error);
  }
}

export async function createCategorie(req, res, next) {
  try {
    const categorie = await CategorieEvent.create({ ...req.body, eventId: req.event._id });
    res.status(201).json(categorie);
  } catch (error) {
    next(error);
  }
}

export async function updateCategorie(req, res, next) {
  try {
    const categorie = await CategorieEvent.findOneAndUpdate(
      { _id: req.params.categorieId, eventId: req.event._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!categorie) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(categorie);
  } catch (error) {
    next(error);
  }
}

export async function deleteCategorie(req, res, next) {
  try {
    const categorie = await CategorieEvent.findOne({
      _id: req.params.categorieId,
      eventId: req.event._id,
    });
    if (!categorie) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    if (categorie.isDefault) {
      throw new ApiError(400, 'La catégorie par défaut ne peut pas être supprimée.');
    }

    const usageCount = await Participant.countDocuments({ categorieId: categorie._id });
    if (usageCount > 0) {
      throw new ApiError(400, 'Cette catégorie est utilisée par des participants et ne peut pas être supprimée.');
    }

    await categorie.deleteOne();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

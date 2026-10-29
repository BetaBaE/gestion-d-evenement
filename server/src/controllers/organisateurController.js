import { z } from 'zod';
import { Organisateur } from '../models/Organisateur.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const organisateurSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  sigle: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  telephone: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email('Email invalide.').optional().or(z.literal('')),
  siteWeb: z.string().optional(),
  logoUrl: z.string().optional(),
  actif: z.boolean().optional(),
});

export const validateOrganisateur = organisateurSchema;

export async function listOrganisateurs(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [items, total] = await Promise.all([
      Organisateur.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Organisateur.countDocuments(),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getOrganisateur(req, res, next) {
  try {
    const organisateur = await Organisateur.findById(req.params.id);
    if (!organisateur) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(organisateur);
  } catch (error) {
    next(error);
  }
}

export async function createOrganisateur(req, res, next) {
  try {
    const organisateur = await Organisateur.create(req.body);
    res.status(201).json(organisateur);
  } catch (error) {
    next(error);
  }
}

export async function updateOrganisateur(req, res, next) {
  try {
    const organisateur = await Organisateur.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!organisateur) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(organisateur);
  } catch (error) {
    next(error);
  }
}

export async function deleteOrganisateur(req, res, next) {
  try {
    const organisateur = await Organisateur.findByIdAndUpdate(
      req.params.id,
      { actif: false },
      { new: true },
    );
    if (!organisateur) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(organisateur);
  } catch (error) {
    next(error);
  }
}

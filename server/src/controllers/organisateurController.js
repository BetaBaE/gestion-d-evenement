import { z } from 'zod';
import { hexColor } from '../validation/badgeElements.js';
import { ALLOWED_FONTS } from '../../../shared/badge-renderer/index.js';
import { Organisateur } from '../models/Organisateur.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { optimizeAndStoreImage, deleteImage } from '../services/imageService.js';

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
  actif: z.boolean().optional(),
  brandKit: z
    .object({
      couleurs: z
        .object({
          principale: hexColor.optional(),
          secondaire: hexColor.optional(),
          accent: hexColor.optional(),
          texte: hexColor.optional(),
        })
        .optional(),
      polices: z
        .object({
          titres: z.enum(ALLOWED_FONTS).optional(),
          texte: z.enum(ALLOWED_FONTS).optional(),
          nom: z.enum(ALLOWED_FONTS).optional(),
        })
        .optional(),
    })
    .optional(),
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

export async function uploadOrganisateurLogo(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Une image est requise.');
    }

    const organisateur = await Organisateur.findById(req.params.id);
    if (!organisateur) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const previousLogoImageId = organisateur.logoImageId;

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'LOGO_ORGANISATEUR',
      organisateurId: organisateur._id,
    });

    organisateur.logoImageId = image._id;
    await organisateur.save();

    await deleteImage(previousLogoImageId);

    res.json(organisateur);
  } catch (error) {
    next(error);
  }
}

export async function deleteOrganisateurLogo(req, res, next) {
  try {
    const organisateur = await Organisateur.findById(req.params.id);
    if (!organisateur) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    await deleteImage(organisateur.logoImageId);
    organisateur.logoImageId = undefined;
    await organisateur.save();

    res.json(organisateur);
  } catch (error) {
    next(error);
  }
}

/**
 * Brand kit of the caller's organisateur (tenant-scoped, so a Gestionnaire
 * can read their own without access to the Super Admin organisateur API).
 * Used for color-picker presets across the back-office.
 */
export async function getBrandKit(req, res, next) {
  try {
    const organisateur = await Organisateur.findById(req.organisateurId).select('brandKit');
    if (!organisateur) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(organisateur.brandKit || {});
  } catch (error) {
    next(error);
  }
}

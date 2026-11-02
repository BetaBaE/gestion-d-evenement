import { z } from 'zod';
import { Partenaire } from '../models/Partenaire.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { optimizeAndStoreImage, deleteImage } from '../services/imageService.js';

const partenaireSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  siteWeb: z.string().optional(),
  actif: z.boolean().optional(),
});

// multer leaves multipart fields as strings, so booleans need coercion
// before this is applied to the multipart create/update routes below.
const partenaireFormSchema = partenaireSchema.extend({
  actif: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .optional(),
});

export const validatePartenaire = partenaireSchema;

export async function listPartenaires(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { organisateurId: req.organisateurId };
    const [items, total] = await Promise.all([
      Partenaire.find(filter).sort({ nom: 1 }).skip(skip).limit(limit),
      Partenaire.countDocuments(filter),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getPartenaire(req, res, next) {
  try {
    const partenaire = await Partenaire.findOne({
      _id: req.params.partenaireId,
      organisateurId: req.organisateurId,
    });
    if (!partenaire) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(partenaire);
  } catch (error) {
    next(error);
  }
}

export async function createPartenaire(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Un logo est requis.');
    }

    const data = partenaireFormSchema.parse(req.body);

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'LOGO_PARTENAIRE',
      organisateurId: req.organisateurId,
    });

    const partenaire = await Partenaire.create({
      ...data,
      logoImageId: image._id,
      organisateurId: req.organisateurId,
    });
    res.status(201).json(partenaire);
  } catch (error) {
    next(error);
  }
}

export async function updatePartenaire(req, res, next) {
  try {
    const partenaire = await Partenaire.findOne({
      _id: req.params.partenaireId,
      organisateurId: req.organisateurId,
    });
    if (!partenaire) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const data = partenaireFormSchema.partial().parse(req.body);
    Object.assign(partenaire, data);

    if (req.file) {
      const previousLogoImageId = partenaire.logoImageId;
      const image = await optimizeAndStoreImage({
        buffer: req.file.buffer,
        type: 'LOGO_PARTENAIRE',
        organisateurId: req.organisateurId,
      });
      partenaire.logoImageId = image._id;
      await partenaire.save();
      await deleteImage(previousLogoImageId);
    } else {
      await partenaire.save();
    }

    res.json(partenaire);
  } catch (error) {
    next(error);
  }
}

export async function deletePartenaire(req, res, next) {
  try {
    const partenaire = await Partenaire.findOneAndDelete({
      _id: req.params.partenaireId,
      organisateurId: req.organisateurId,
    });
    if (!partenaire) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    await deleteImage(partenaire.logoImageId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

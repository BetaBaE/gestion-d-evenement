import { z } from 'zod';
import { parse as parseCsv } from 'csv-parse/sync';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { optimizeAndStoreImage, deleteImage } from '../services/imageService.js';

const organismeSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  siegeSocial: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  telephone: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email('Email invalide.').optional().or(z.literal('')),
  siteWeb: z.string().optional(),
  contactNom: z.string().optional(),
  contactFonction: z.string().optional(),
  contactTelephone: z.string().optional(),
  contactEmail: z.string().email('Email invalide.').optional().or(z.literal('')),
});

export const validateOrganisme = organismeSchema;

export async function listOrganismes(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { eventId: req.event._id };
    const [items, total] = await Promise.all([
      InvitedOrganism.find(filter).sort({ nom: 1 }).skip(skip).limit(limit),
      InvitedOrganism.countDocuments(filter),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getOrganisme(req, res, next) {
  try {
    const organisme = await InvitedOrganism.findOne({
      _id: req.params.organismeId,
      eventId: req.event._id,
    });
    if (!organisme) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(organisme);
  } catch (error) {
    next(error);
  }
}

export async function createOrganisme(req, res, next) {
  try {
    const organisme = await InvitedOrganism.create({ ...req.body, eventId: req.event._id });
    res.status(201).json(organisme);
  } catch (error) {
    next(error);
  }
}

export async function updateOrganisme(req, res, next) {
  try {
    const organisme = await InvitedOrganism.findOneAndUpdate(
      { _id: req.params.organismeId, eventId: req.event._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!organisme) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(organisme);
  } catch (error) {
    next(error);
  }
}

export async function deleteOrganisme(req, res, next) {
  try {
    const organisme = await InvitedOrganism.findOneAndDelete({
      _id: req.params.organismeId,
      eventId: req.event._id,
    });
    if (!organisme) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    await deleteImage(organisme.logoImageId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function uploadOrganismeLogo(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Une image est requise.');
    }

    const organisme = await InvitedOrganism.findOne({
      _id: req.params.organismeId,
      eventId: req.event._id,
    });
    if (!organisme) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const previousLogoImageId = organisme.logoImageId;

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'LOGO_ORGANISME',
      organisateurId: req.organisateurId,
      eventId: req.event._id,
    });

    organisme.logoImageId = image._id;
    await organisme.save();

    await deleteImage(previousLogoImageId);

    res.json(organisme);
  } catch (error) {
    next(error);
  }
}

export async function deleteOrganismeLogo(req, res, next) {
  try {
    const organisme = await InvitedOrganism.findOne({
      _id: req.params.organismeId,
      eventId: req.event._id,
    });
    if (!organisme) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    await deleteImage(organisme.logoImageId);
    organisme.logoImageId = undefined;
    await organisme.save();

    res.json(organisme);
  } catch (error) {
    next(error);
  }
}

export async function importOrganismes(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Un fichier CSV est requis.');
    }

    const records = parseCsv(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const rows = [];
    const errors = [];
    records.forEach((record, index) => {
      const result = organismeSchema.safeParse(record);
      if (result.success) {
        rows.push({ ...result.data, eventId: req.event._id });
      } else {
        errors.push({ line: index + 2, message: result.error.issues[0]?.message });
      }
    });

    if (rows.length === 0) {
      throw new ApiError(400, 'Aucune ligne valide trouvée dans le fichier.', errors);
    }

    const created = await InvitedOrganism.insertMany(rows, { ordered: false });
    res.status(201).json({ created: created.length, errors });
  } catch (error) {
    next(error);
  }
}

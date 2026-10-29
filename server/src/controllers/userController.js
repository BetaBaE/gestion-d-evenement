import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Organisateur } from '../models/Organisateur.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const createUserSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis.'),
  prenom: z.string().min(1, 'Le prénom est requis.'),
  email: z.string().email('Email invalide.'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
  role: z.enum(['SUPER_ADMIN', 'GESTIONNAIRE']),
  organisateurId: z.string().optional(),
  telephone: z.string().optional(),
}).refine((data) => data.role !== 'GESTIONNAIRE' || !!data.organisateurId, {
  message: "L'organisateur est requis pour un gestionnaire.",
  path: ['organisateurId'],
});

const updateUserSchema = z.object({
  nom: z.string().min(1).optional(),
  prenom: z.string().min(1).optional(),
  email: z.string().email('Email invalide.').optional(),
  role: z.enum(['SUPER_ADMIN', 'GESTIONNAIRE']).optional(),
  organisateurId: z.string().optional(),
  telephone: z.string().optional(),
  actif: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
});

export async function listUsers(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.organisateurId) {
      filter.organisateurId = req.query.organisateurId;
    }
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { password, ...rest } = createUserSchema.parse(req.body);

    if (rest.organisateurId) {
      const organisateur = await Organisateur.findById(rest.organisateurId);
      if (!organisateur) {
        throw new ApiError(400, "L'organisateur spécifié n'existe pas.");
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ ...rest, passwordHash });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const data = updateUserSchema.parse(req.body);

    if (data.organisateurId) {
      const organisateur = await Organisateur.findById(data.organisateurId);
      if (!organisateur) {
        throw new ApiError(400, "L'organisateur spécifié n'existe pas.");
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function resetUserPassword(req, res, next) {
  try {
    const { password } = resetPasswordSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { passwordHash }, { new: true });
    if (!user) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function deactivateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { actif: false },
      { new: true },
    );
    if (!user) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

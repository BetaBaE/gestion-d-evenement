import mongoose from 'mongoose';
import { Organisateur } from '../models/Organisateur.js';
import { ApiError } from './errorHandler.js';

/**
 * Resolves req.organisateurId for admin routes nested under
 * /api/admin/organisateurs/:organisateurId/...
 *
 * GESTIONNAIRE: the :organisateurId route param is ignored; the org
 * from their own JWT is always used, so a client-supplied id can
 * never grant access to another tenant's data.
 * SUPER_ADMIN: the :organisateurId route param is used as-is, after
 * confirming that organisateur actually exists (404 otherwise).
 */
export async function tenantScope(req, res, next) {
  try {
    if (req.user.role === 'GESTIONNAIRE') {
      req.organisateurId = req.user.organisateurId;
      return next();
    }

    const paramId = req.params.organisateurId;
    if (!paramId || !mongoose.Types.ObjectId.isValid(paramId)) {
      return next(new ApiError(404, 'Ressource introuvable'));
    }

    const organisateur = await Organisateur.findById(paramId);
    if (!organisateur) {
      return next(new ApiError(404, 'Ressource introuvable'));
    }

    req.organisateurId = paramId;
    next();
  } catch (error) {
    next(error);
  }
}

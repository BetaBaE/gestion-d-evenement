import { verifyAuthToken } from '../services/tokenService.js';
import { ApiError } from './errorHandler.js';

const COOKIE_NAME = 'auth_token';

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return next(new ApiError(401, 'Authentification requise.'));
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(new ApiError(401, 'Session invalide ou expirée.'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Accès refusé.'));
    }
    next();
  };
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;

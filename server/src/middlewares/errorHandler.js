import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Ressource introuvable' });
}

export function errorHandler(err, req, res, next) {
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Cette ressource existe déjà.' });
  }

  // multer: file over the route's size limit.
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Fichier trop volumineux.' });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Données invalides.', details: err.issues });
  }

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Une erreur interne est survenue.';

  if (!err.statusCode) {
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    ...(err.details ? { details: err.details } : {}),
  });
}

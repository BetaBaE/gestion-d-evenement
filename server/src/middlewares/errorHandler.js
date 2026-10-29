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

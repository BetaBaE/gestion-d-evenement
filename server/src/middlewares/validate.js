import { ZodError } from 'zod';
import { ApiError } from './errorHandler.js';

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new ApiError(400, 'Données invalides.', error.issues));
      }
      next(error);
    }
  };
}

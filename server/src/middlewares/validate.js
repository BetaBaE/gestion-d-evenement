import { ZodError } from 'zod';
import { ApiError } from './errorHandler.js';

// react-admin forms serialize cleared/unset number and date fields as `null`
// rather than omitting the key. Schemas express "not provided" with
// `.optional()`, so strip `null`s (recursively, objects only) before
// validating rather than requiring every schema to also handle `null`.
function stripNulls(value) {
  if (Array.isArray(value)) {
    return value.map(stripNulls);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === null) continue;
      result[key] = stripNulls(val);
    }
    return result;
  }
  return value;
}

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(stripNulls(req.body));
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new ApiError(400, 'Données invalides.', error.issues));
      }
      next(error);
    }
  };
}

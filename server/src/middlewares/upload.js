import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from './errorHandler.js';

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Seuls les fichiers CSV sont acceptés.'));
    }
    cb(null, true);
  },
});

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Seuls les fichiers JPEG, PNG et WebP sont acceptés.'));
    }
    cb(null, true);
  },
});

const IMPORT_MAX_BYTES = 20 * 1024 * 1024;

// Template file (.badge.json): images are embedded, hence the 20 MB limit.
export const templateFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMPORT_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.json')) {
      return cb(new ApiError(400, 'Choisissez un fichier .badge.json exporté depuis l’application.'));
    }
    cb(null, true);
  },
});

const DESIGN_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

// Design made elsewhere (Canva, Illustrator…): PDF or image, used as background.
export const designUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMPORT_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (!DESIGN_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Seuls les fichiers PDF, PNG, JPEG et WebP sont acceptés.'));
    }
    cb(null, true);
  },
});

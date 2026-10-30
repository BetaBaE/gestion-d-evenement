import multer from 'multer';
import { env } from '../config/env.js';

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

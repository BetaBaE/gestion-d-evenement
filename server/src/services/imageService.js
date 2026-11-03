import crypto from 'node:crypto';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { Image } from '../models/Image.js';
import { ApiError } from '../middlewares/errorHandler.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_OPTIMIZED_BYTES = 300 * 1024;

const PROFILES = {
  PHOTO_PARTICIPANT: { width: 400, height: 400, fit: 'cover', quality: 75 },
  LOGO_ORGANISATEUR: { width: 800, fit: 'inside', quality: 82 },
  LOGO_ORGANISME: { width: 800, fit: 'inside', quality: 82 },
  FOND_BADGE: { width: 1011, height: 638, fit: 'cover', quality: 80 },
  LOGO_EVENEMENT: { width: 800, fit: 'inside', quality: 82 },
  BANNIERE_BADGE: { width: 1600, fit: 'inside', quality: 82 },
  LOGO_PARTENAIRE: { width: 600, fit: 'inside', quality: 82 },
  BLOC_IMAGE: { width: 1200, fit: 'inside', quality: 82 },
  // Imported design slices are already cut at 300 dpi to the panel size:
  // kept at that resolution, quality lowered step by step to fit 2 MB.
  FOND_PAGE: { fit: 'none', quality: 85, minQuality: 40, maxBytes: 2 * 1024 * 1024 },
};

async function detectRealMimeType(buffer) {
  const detected = await fileTypeFromBuffer(buffer);
  return detected?.mime;
}

export async function optimizeAndStoreImage({ buffer, type, organisateurId, eventId }) {
  const realMimeType = await detectRealMimeType(buffer);
  if (!realMimeType || !ALLOWED_MIME_TYPES.has(realMimeType)) {
    throw new ApiError(400, 'Format d\'image non supporté. Utilisez JPEG, PNG ou WebP.');
  }

  const profile = PROFILES[type];
  if (!profile) {
    throw new ApiError(400, "Type d'image invalide.");
  }

  let pipeline = sharp(buffer).rotate();

  if (profile.fit === 'cover') {
    pipeline = pipeline.resize(profile.width, profile.height, { fit: 'cover' });
  } else if (profile.fit !== 'none') {
    pipeline = pipeline.resize(profile.width, profile.height || null, { fit: 'inside', withoutEnlargement: true });
  }

  const maxBytes = profile.maxBytes ?? MAX_OPTIMIZED_BYTES;
  // sharp strips EXIF/ICC metadata by default unless .withMetadata() is called,
  // so simply not calling it is the metadata-stripping step.
  let quality = profile.quality;
  let { data: finalBuffer, info } = await pipeline.clone().webp({ quality }).toBuffer({ resolveWithObject: true });
  while (finalBuffer.length > maxBytes && profile.minQuality && quality - 10 >= profile.minQuality) {
    quality -= 10;
    ({ data: finalBuffer, info } = await pipeline.clone().webp({ quality }).toBuffer({ resolveWithObject: true }));
  }

  if (finalBuffer.length > maxBytes) {
    throw new ApiError(
      400,
      maxBytes >= 1024 * 1024
        ? `L'image optimisée dépasse la taille maximale autorisée (${Math.round(maxBytes / (1024 * 1024))} Mo).`
        : `L'image optimisée dépasse la taille maximale autorisée (${Math.round(maxBytes / 1024)} Ko).`,
    );
  }

  const hash = crypto.createHash('sha256').update(finalBuffer).digest('hex');

  const image = await Image.create({
    data: finalBuffer,
    mimeType: 'image/webp',
    taille: finalBuffer.length,
    largeur: info.width,
    hauteur: info.height,
    type,
    organisateurId,
    eventId,
    hash,
  });

  return image;
}

export async function getImageWithData(imageId) {
  return Image.findById(imageId).select('+data');
}

export async function deleteImage(imageId) {
  if (!imageId) return;
  await Image.findByIdAndDelete(imageId);
}

import { Image } from '../models/Image.js';
import { Participant } from '../models/Participant.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { optimizeAndStoreImage } from '../services/imageService.js';
import { loadOpenScanEvent } from '../services/scanAccess.js';

/**
 * Serves image bytes with ETag/Cache-Control. Access control:
 * - LOGO_ORGANISATEUR / LOGO_ORGANISME / FOND_BADGE: readable by authenticated
 *   back-office users of that organisateur, and by anyone viewing a public
 *   page (registration form) tied to one of that organisateur's events —
 *   there is no session on the public side, so these three types are served
 *   without an auth check here; the only thing that could be leaked is
 *   branding imagery, never personal data.
 * - PHOTO_PARTICIPANT: never served through this public-ish path. It is
 *   served either by the authenticated admin route (requireAuth + tenantScope,
 *   mounted separately) or by the scan-token route in publicScanController.js.
 */
export async function serveImage(req, res, next) {
  try {
    const image = await Image.findById(req.params.id).select('+data mimeType hash type organisateurId');
    if (!image) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    if (image.type === 'PHOTO_PARTICIPANT') {
      throw new ApiError(403, 'Accès refusé.');
    }

    if (req.header('If-None-Match') === image.hash) {
      return res.status(304).end();
    }

    res.set('Content-Type', image.mimeType);
    res.set('ETag', image.hash);
    res.set('Cache-Control', 'private, max-age=86400');
    res.send(image.data);
  } catch (error) {
    next(error);
  }
}

export async function serveAdminImage(req, res, next) {
  try {
    const image = await Image.findById(req.params.id).select('+data mimeType hash organisateurId');
    if (!image || image.organisateurId.toString() !== req.organisateurId.toString()) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    if (req.header('If-None-Match') === image.hash) {
      return res.status(304).end();
    }

    res.set('Content-Type', image.mimeType);
    res.set('ETag', image.hash);
    res.set('Cache-Control', 'private, max-age=86400');
    res.send(image.data);
  } catch (error) {
    next(error);
  }
}

/**
 * Generic upload for images referenced by arbitrary badge blocks (the
 * `image` block, or an image/logo field inside any other block's props —
 * e.g. enteteEvenement.banniereImageId when set from the builder rather
 * than the fixed per-field routes in eventController.js). Always tagged
 * BLOC_IMAGE and scoped to the event via eventScope, so the builder can
 * upload without the server needing a route per block type.
 */
export async function uploadBlocImage(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Une image est requise.');
    }

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'BLOC_IMAGE',
      organisateurId: req.organisateurId,
      // Uploaded from a template (no event) or from an event's badge.
      eventId: req.event?._id,
    });

    res.status(201).json({ imageId: image._id, url: `/admin/organisateurs/${req.organisateurId}/images/${image._id}` });
  } catch (error) {
    next(error);
  }
}

export async function servePhotoViaScanToken(req, res, next) {
  try {
    const { event } = await loadOpenScanEvent(req.params.scanToken);

    const participant = await Participant.findOne({ _id: req.params.participantId, eventId: event._id });
    if (!participant || !participant.photoImageId) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const image = await Image.findById(participant.photoImageId).select('+data mimeType hash');
    if (!image) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    res.set('Content-Type', image.mimeType);
    res.set('Cache-Control', 'private, no-store');
    res.send(image.data);
  } catch (error) {
    next(error);
  }
}

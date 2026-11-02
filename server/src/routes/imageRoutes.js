import { Router } from 'express';
import { serveImage, serveAdminImage, servePhotoViaScanToken } from '../controllers/imageController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { tenantScope } from '../middlewares/tenantScope.js';
import { scanRateLimit } from '../middlewares/rateLimit.js';

/**
 * Images are embedded by the front end, which runs on a different port.
 * When the app is reached by IP address (LAN testing), a different port is
 * a different *site* (IPs have no registrable domain), so the global
 * `same-site` CORP blocks them. `cross-origin` is safe here: private images
 * still require the session cookie, which is SameSite=Lax and therefore
 * never sent on another website's image requests.
 */
function allowCrossOriginEmbedding(req, res, next) {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}

export const publicImageRoutes = Router();
publicImageRoutes.get('/:id', allowCrossOriginEmbedding, serveImage);

export const adminImageRoutes = Router();
adminImageRoutes.use(
  '/organisateurs/:organisateurId/images',
  allowCrossOriginEmbedding,
  requireAuth,
  requireRole('SUPER_ADMIN', 'GESTIONNAIRE'),
  tenantScope,
);
adminImageRoutes.get('/organisateurs/:organisateurId/images/:id', serveAdminImage);

export const publicScanPhotoRoutes = Router();
publicScanPhotoRoutes.get('/:scanToken/photo/:participantId', allowCrossOriginEmbedding, scanRateLimit, servePhotoViaScanToken);

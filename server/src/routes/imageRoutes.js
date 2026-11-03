import { Router } from 'express';
import { serveImage, serveAdminImage, servePhotoViaScanToken } from '../controllers/imageController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { tenantScope } from '../middlewares/tenantScope.js';
import { scanRateLimit } from '../middlewares/rateLimit.js';
import { noStore } from '../services/scanAccess.js';

export const publicImageRoutes = Router();
publicImageRoutes.get('/:id', serveImage);

export const adminImageRoutes = Router();
adminImageRoutes.use(
  '/organisateurs/:organisateurId/images',
  requireAuth,
  requireRole('SUPER_ADMIN', 'GESTIONNAIRE'),
  tenantScope,
);
adminImageRoutes.get('/organisateurs/:organisateurId/images/:id', serveAdminImage);

export const publicScanPhotoRoutes = Router();
publicScanPhotoRoutes.get('/:scanToken/photo/:participantId', scanRateLimit, noStore, servePhotoViaScanToken);

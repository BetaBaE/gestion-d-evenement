import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { tenantScope } from '../middlewares/tenantScope.js';
import { validateBody } from '../middlewares/validate.js';
import {
  listOrganisateurs,
  getOrganisateur,
  createOrganisateur,
  updateOrganisateur,
  deleteOrganisateur,
  uploadOrganisateurLogo,
  deleteOrganisateurLogo,
  getBrandKit,
  validateOrganisateur,
} from '../controllers/organisateurController.js';
import { imageUpload } from '../middlewares/upload.js';
import { eventRoutes } from './eventRoutes.js';
import { emailSettingsRoutes } from './emailSettingsRoutes.js';
import { partenaireRoutes } from './partenaireRoutes.js';
import { modeleBadgeRoutes } from './modeleBadgeRoutes.js';

export const organisateurRoutes = Router();

organisateurRoutes.use(requireAuth);

organisateurRoutes.get('/', requireRole('SUPER_ADMIN'), listOrganisateurs);
organisateurRoutes.get('/:id', requireRole('SUPER_ADMIN'), getOrganisateur);
organisateurRoutes.post('/', requireRole('SUPER_ADMIN'), validateBody(validateOrganisateur), createOrganisateur);
organisateurRoutes.put(
  '/:id',
  requireRole('SUPER_ADMIN'),
  validateBody(validateOrganisateur.partial()),
  updateOrganisateur,
);
organisateurRoutes.delete('/:id', requireRole('SUPER_ADMIN'), deleteOrganisateur);
organisateurRoutes.post(
  '/:id/logo',
  requireRole('SUPER_ADMIN'),
  imageUpload.single('file'),
  uploadOrganisateurLogo,
);
organisateurRoutes.delete('/:id/logo', requireRole('SUPER_ADMIN'), deleteOrganisateurLogo);

organisateurRoutes.get('/:organisateurId/brand-kit', requireRole('SUPER_ADMIN', 'GESTIONNAIRE'), tenantScope, getBrandKit);

organisateurRoutes.use(
  '/:organisateurId/events',
  requireRole('SUPER_ADMIN', 'GESTIONNAIRE'),
  tenantScope,
  eventRoutes,
);

organisateurRoutes.use(
  '/:organisateurId/email-settings',
  requireRole('SUPER_ADMIN', 'GESTIONNAIRE'),
  tenantScope,
  emailSettingsRoutes,
);

organisateurRoutes.use(
  '/:organisateurId/partenaires',
  requireRole('SUPER_ADMIN', 'GESTIONNAIRE'),
  tenantScope,
  partenaireRoutes,
);

organisateurRoutes.use(
  '/:organisateurId/modeles-badge',
  requireRole('SUPER_ADMIN', 'GESTIONNAIRE'),
  tenantScope,
  modeleBadgeRoutes,
);

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
  validateOrganisateur,
} from '../controllers/organisateurController.js';
import { eventRoutes } from './eventRoutes.js';

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

organisateurRoutes.use(
  '/:organisateurId/events',
  requireRole('SUPER_ADMIN', 'GESTIONNAIRE'),
  tenantScope,
  eventRoutes,
);

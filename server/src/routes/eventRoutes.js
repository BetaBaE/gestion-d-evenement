import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { eventScope } from '../middlewares/eventScope.js';
import { imageUpload } from '../middlewares/upload.js';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  regenerateFormToken,
  regenerateScanToken,
  uploadBadgeBanniere,
  deleteBadgeBanniere,
  uploadBadgeLogoEvenement,
  deleteBadgeLogoEvenement,
  applyBadgeTemplate,
  getBadgeContenu,
  updateBadgeContenu,
  previewBadge,
  previewBadgeHtml,
  validateEvent,
} from '../controllers/eventController.js';
import { uploadBlocImage } from '../controllers/imageController.js';
import { categorieRoutes } from './categorieRoutes.js';
import { organismeRoutes } from './organismeRoutes.js';
import { participantRoutes } from './participantRoutes.js';
import { statsRoutes } from './statsRoutes.js';

export const eventRoutes = Router({ mergeParams: true });

eventRoutes.get('/', listEvents);
eventRoutes.get('/:eventId', eventScope, getEvent);
eventRoutes.post('/', validateBody(validateEvent), createEvent);
eventRoutes.put('/:eventId', eventScope, validateBody(validateEvent.partial()), updateEvent);
eventRoutes.delete('/:eventId', eventScope, deleteEvent);
eventRoutes.post('/:eventId/regenerer-form-token', eventScope, regenerateFormToken);
eventRoutes.post('/:eventId/regenerer-scan-token', eventScope, regenerateScanToken);
eventRoutes.post('/:eventId/badge-banniere', eventScope, imageUpload.single('file'), uploadBadgeBanniere);
eventRoutes.delete('/:eventId/badge-banniere', eventScope, deleteBadgeBanniere);
eventRoutes.post('/:eventId/badge-logo-evenement', eventScope, imageUpload.single('file'), uploadBadgeLogoEvenement);
eventRoutes.delete('/:eventId/badge-logo-evenement', eventScope, deleteBadgeLogoEvenement);
eventRoutes.post('/:eventId/badge-template', eventScope, applyBadgeTemplate);
eventRoutes.get('/:eventId/badge-contenu', eventScope, getBadgeContenu);
eventRoutes.put('/:eventId/badge-contenu', eventScope, updateBadgeContenu);
eventRoutes.post('/:eventId/badge-image', eventScope, imageUpload.single('file'), uploadBlocImage);
eventRoutes.get('/:eventId/badge-apercu', eventScope, previewBadge);
eventRoutes.get('/:eventId/badge-apercu-html', eventScope, previewBadgeHtml);

eventRoutes.use('/:eventId/categories', eventScope, categorieRoutes);
eventRoutes.use('/:eventId/organismes', eventScope, organismeRoutes);
eventRoutes.use('/:eventId/participants', eventScope, participantRoutes);
eventRoutes.use('/:eventId/stats', eventScope, statsRoutes);

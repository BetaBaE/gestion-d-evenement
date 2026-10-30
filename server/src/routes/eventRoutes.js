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
  uploadBadgeBackground,
  deleteBadgeBackground,
  previewBadge,
  validateEvent,
} from '../controllers/eventController.js';
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
eventRoutes.post('/:eventId/badge-fond', eventScope, imageUpload.single('file'), uploadBadgeBackground);
eventRoutes.delete('/:eventId/badge-fond', eventScope, deleteBadgeBackground);
eventRoutes.get('/:eventId/badge-apercu', eventScope, previewBadge);

eventRoutes.use('/:eventId/categories', eventScope, categorieRoutes);
eventRoutes.use('/:eventId/organismes', eventScope, organismeRoutes);
eventRoutes.use('/:eventId/participants', eventScope, participantRoutes);
eventRoutes.use('/:eventId/stats', eventScope, statsRoutes);

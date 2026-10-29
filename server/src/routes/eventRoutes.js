import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { eventScope } from '../middlewares/eventScope.js';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  regenerateFormToken,
  regenerateScanToken,
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

eventRoutes.use('/:eventId/categories', eventScope, categorieRoutes);
eventRoutes.use('/:eventId/organismes', eventScope, organismeRoutes);
eventRoutes.use('/:eventId/participants', eventScope, participantRoutes);
eventRoutes.use('/:eventId/stats', eventScope, statsRoutes);

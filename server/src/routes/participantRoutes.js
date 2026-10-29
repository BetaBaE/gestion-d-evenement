import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import {
  listParticipants,
  getParticipant,
  createManualParticipant,
  updateParticipant,
  deleteParticipant,
  validateAndSendBadge,
  validateAndSendBadgeBulk,
  refuseParticipant,
  resendEmail,
  listParticipantEmailLogs,
  validateManualParticipant,
} from '../controllers/participantController.js';
import {
  printSingleBadge,
  printBatchBadges,
  exportParticipants,
} from '../controllers/badgePrintController.js';

export const participantRoutes = Router({ mergeParams: true });

participantRoutes.get('/', listParticipants);
participantRoutes.get('/export', exportParticipants);
participantRoutes.get('/:participantId', getParticipant);
participantRoutes.post('/', validateBody(validateManualParticipant), createManualParticipant);
participantRoutes.put('/:participantId', updateParticipant);
participantRoutes.delete('/:participantId', deleteParticipant);
participantRoutes.post('/:participantId/valider', validateAndSendBadge);
participantRoutes.post('/valider-lot', validateAndSendBadgeBulk);
participantRoutes.post('/:participantId/refuser', refuseParticipant);
participantRoutes.post('/:participantId/renvoyer-email', resendEmail);
participantRoutes.get('/:participantId/emails', listParticipantEmailLogs);
participantRoutes.get('/:participantId/badge.pdf', printSingleBadge);
participantRoutes.post('/badges.pdf', printBatchBadges);

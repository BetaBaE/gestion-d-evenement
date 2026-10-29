import { Router } from 'express';
import {
  eventSummary,
  presenceByCategorie,
  presenceByOrganisme,
  arrivalCurve,
  noShowParticipants,
  participantDetail,
} from '../controllers/statsController.js';

export const statsRoutes = Router({ mergeParams: true });

statsRoutes.get('/summary', eventSummary);
statsRoutes.get('/presence-categorie', presenceByCategorie);
statsRoutes.get('/presence-organisme', presenceByOrganisme);
statsRoutes.get('/arrivees', arrivalCurve);
statsRoutes.get('/absents', noShowParticipants);
statsRoutes.get('/participants/:participantId', participantDetail);

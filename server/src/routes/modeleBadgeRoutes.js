import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import {
  listModelesBadge,
  getModeleBadge,
  createModeleBadge,
  updateModeleBadge,
  deleteModeleBadge,
  setDefaultModeleBadge,
  validateModeleBadge,
} from '../controllers/modeleBadgeController.js';

export const modeleBadgeRoutes = Router({ mergeParams: true });

modeleBadgeRoutes.get('/', listModelesBadge);
modeleBadgeRoutes.get('/:modeleId', getModeleBadge);
modeleBadgeRoutes.post('/', validateBody(validateModeleBadge), createModeleBadge);
modeleBadgeRoutes.put('/:modeleId', validateBody(validateModeleBadge.partial()), updateModeleBadge);
modeleBadgeRoutes.delete('/:modeleId', deleteModeleBadge);
modeleBadgeRoutes.post('/:modeleId/defaut', setDefaultModeleBadge);

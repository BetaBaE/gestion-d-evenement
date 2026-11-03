import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { imageUpload } from '../middlewares/upload.js';
import { uploadBlocImage } from '../controllers/imageController.js';
import {
  listModelesBadge,
  getModeleBadge,
  createModeleBadge,
  updateModeleBadge,
  deleteModeleBadge,
  setDefaultModeleBadge,
  getModeleEditorContext,
  previewModeleBadge,
  validateModeleBadge,
  validateCreateModeleBadge,
} from '../controllers/modeleBadgeController.js';

export const modeleBadgeRoutes = Router({ mergeParams: true });

modeleBadgeRoutes.get('/', listModelesBadge);
modeleBadgeRoutes.get('/:modeleId', getModeleBadge);
modeleBadgeRoutes.get('/:modeleId/contexte', getModeleEditorContext);
modeleBadgeRoutes.get('/:modeleId/apercu', previewModeleBadge);
modeleBadgeRoutes.post('/', validateBody(validateCreateModeleBadge), createModeleBadge);
modeleBadgeRoutes.put('/:modeleId', validateBody(validateModeleBadge.partial()), updateModeleBadge);
modeleBadgeRoutes.delete('/:modeleId', deleteModeleBadge);
modeleBadgeRoutes.post('/:modeleId/defaut', setDefaultModeleBadge);
modeleBadgeRoutes.post('/:modeleId/badge-image', imageUpload.single('file'), uploadBlocImage);

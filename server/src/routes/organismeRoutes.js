import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import { csvUpload } from '../middlewares/upload.js';
import {
  listOrganismes,
  getOrganisme,
  createOrganisme,
  updateOrganisme,
  deleteOrganisme,
  importOrganismes,
  validateOrganisme,
} from '../controllers/organismeController.js';

export const organismeRoutes = Router({ mergeParams: true });

organismeRoutes.get('/', listOrganismes);
organismeRoutes.get('/:organismeId', getOrganisme);
organismeRoutes.post('/', validateBody(validateOrganisme), createOrganisme);
organismeRoutes.put('/:organismeId', validateBody(validateOrganisme.partial()), updateOrganisme);
organismeRoutes.delete('/:organismeId', deleteOrganisme);
organismeRoutes.post('/import', csvUpload.single('file'), importOrganismes);

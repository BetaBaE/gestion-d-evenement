import { Router } from 'express';
import { imageUpload } from '../middlewares/upload.js';
import {
  listPartenaires,
  getPartenaire,
  createPartenaire,
  updatePartenaire,
  deletePartenaire,
} from '../controllers/partenaireController.js';

export const partenaireRoutes = Router({ mergeParams: true });

partenaireRoutes.get('/', listPartenaires);
partenaireRoutes.get('/:partenaireId', getPartenaire);
partenaireRoutes.post('/', imageUpload.single('file'), createPartenaire);
partenaireRoutes.put('/:partenaireId', imageUpload.single('file'), updatePartenaire);
partenaireRoutes.delete('/:partenaireId', deletePartenaire);

import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import {
  listCategories,
  createCategorie,
  updateCategorie,
  deleteCategorie,
  validateCategorie,
} from '../controllers/categorieController.js';

export const categorieRoutes = Router({ mergeParams: true });

categorieRoutes.get('/', listCategories);
categorieRoutes.post('/', validateBody(validateCategorie), createCategorie);
categorieRoutes.put('/:categorieId', validateBody(validateCategorie.partial()), updateCategorie);
categorieRoutes.delete('/:categorieId', deleteCategorie);

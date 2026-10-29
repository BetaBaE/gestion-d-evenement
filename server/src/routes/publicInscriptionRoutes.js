import { Router } from 'express';
import { getInscriptionForm, submitInscription } from '../controllers/publicInscriptionController.js';
import { publicRateLimit } from '../middlewares/rateLimit.js';

export const publicInscriptionRoutes = Router();

publicInscriptionRoutes.get('/:formToken', publicRateLimit, getInscriptionForm);
publicInscriptionRoutes.post('/:formToken', publicRateLimit, submitInscription);

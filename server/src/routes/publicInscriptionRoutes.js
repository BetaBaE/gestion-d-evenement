import { Router } from 'express';
import { getInscriptionForm, submitInscription } from '../controllers/publicInscriptionController.js';
import { publicRateLimit } from '../middlewares/rateLimit.js';
import { imageUpload } from '../middlewares/upload.js';

export const publicInscriptionRoutes = Router();

publicInscriptionRoutes.get('/:formToken', publicRateLimit, getInscriptionForm);
publicInscriptionRoutes.post('/:formToken', publicRateLimit, imageUpload.any(), submitInscription);

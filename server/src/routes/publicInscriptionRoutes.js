import { Router } from 'express';
import { getInscriptionForm, submitInscription } from '../controllers/publicInscriptionController.js';
import { publicRateLimit } from '../middlewares/rateLimit.js';
import { imageUpload } from '../middlewares/upload.js';
import { requireTurnstile } from '../middlewares/requireTurnstile.js';

export const publicInscriptionRoutes = Router();

publicInscriptionRoutes.get('/:formToken', publicRateLimit, getInscriptionForm);
// Bot check before the multipart body (photos) is read: the token travels in
// the cf-turnstile-response header. Rate limit and honeypot stay in place.
publicInscriptionRoutes.post('/:formToken', publicRateLimit, requireTurnstile('inscription'), imageUpload.any(), submitInscription);

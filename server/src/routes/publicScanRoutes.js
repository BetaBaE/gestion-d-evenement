import { Router } from 'express';
import { checkScanAccess, recordScan } from '../controllers/publicScanController.js';
import { scanRateLimit } from '../middlewares/rateLimit.js';

export const publicScanRoutes = Router();

publicScanRoutes.get('/:scanToken', scanRateLimit, checkScanAccess);
publicScanRoutes.post('/:scanToken', scanRateLimit, recordScan);

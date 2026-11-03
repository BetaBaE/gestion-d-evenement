import { Router } from 'express';
import { checkScanAccess, recordScan } from '../controllers/publicScanController.js';
import { scanRateLimit } from '../middlewares/rateLimit.js';
import { noStore } from '../services/scanAccess.js';

export const publicScanRoutes = Router();
publicScanRoutes.use(noStore);

publicScanRoutes.get('/:scanToken', scanRateLimit, checkScanAccess);
publicScanRoutes.post('/:scanToken', scanRateLimit, recordScan);

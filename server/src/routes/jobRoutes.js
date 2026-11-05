import { Router } from 'express';
import { listJobs, advanceJobs, cancelJob, retryJobFailures, downloadJobFile } from '../controllers/jobController.js';

export const jobRoutes = Router({ mergeParams: true });

jobRoutes.get('/', listJobs);
jobRoutes.post('/avancer', advanceJobs);
jobRoutes.post('/:jobId/annuler', cancelJob);
jobRoutes.post('/:jobId/reessayer', retryJobFailures);
jobRoutes.get('/:jobId/fichiers/:fileId', downloadJobFile);

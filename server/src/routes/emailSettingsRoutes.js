import { Router } from 'express';
import { getEmailSettings, upsertEmailSettings, testEmailSettings } from '../controllers/emailSettingsController.js';

export const emailSettingsRoutes = Router({ mergeParams: true });

emailSettingsRoutes.get('/', getEmailSettings);
emailSettingsRoutes.put('/', upsertEmailSettings);
emailSettingsRoutes.post('/test', testEmailSettings);

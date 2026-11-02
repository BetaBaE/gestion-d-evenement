import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authRoutes } from './routes/authRoutes.js';
import { organisateurRoutes } from './routes/organisateurRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { publicInscriptionRoutes } from './routes/publicInscriptionRoutes.js';
import { publicScanRoutes } from './routes/publicScanRoutes.js';
import { publicImageRoutes, adminImageRoutes, publicScanPhotoRoutes } from './routes/imageRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

export const app = express();

// The admin UI (:5173) and the API (:4000) are different origins. Image
// routes override this to `cross-origin` (see routes/imageRoutes.js), since
// the UI embeds API-served images and Helmet's default blocked them all.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({ origin: env.clientUrls, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/organisateurs', organisateurRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/public/inscription', publicInscriptionRoutes);
app.use('/api/public/scan', publicScanRoutes);
app.use('/api/public/scan', publicScanPhotoRoutes);
app.use('/api/images', publicImageRoutes);
app.use('/api/admin', adminImageRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

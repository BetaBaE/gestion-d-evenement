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

// On Vercel every request arrives through its proxy: trust one hop so
// req.ip is the visitor's address (rate limits per visitor, not shared).
if (process.env.VERCEL) app.set('trust proxy', 1);

// The app reaches the API through a same-origin proxy (Vite in dev, Nginx
// in production), so images are same-origin; `same-site` (instead of
// Helmet's default `same-origin`) leaves headroom for a split subdomain.
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

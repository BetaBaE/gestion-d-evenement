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
import { publicConfigRoutes } from './routes/publicConfigRoutes.js';
import { publicImageRoutes, adminImageRoutes, publicScanPhotoRoutes } from './routes/imageRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { kickWorkAfterRequest } from './jobs/worker.js';

export const app = express();

// Behind Vercel (or Nginx/Caddy with TRUST_PROXY) requests arrive through a
// proxy: trust exactly those hops so req.ip is the visitor's address (rate
// limits per visitor, IP hint for the bot check). See env.trustProxy.
if (env.trustProxy !== false) app.set('trust proxy', env.trustProxy);

if (!env.turnstile.enabled && env.isProduction) {
  console.warn('[turnstile] WARNING: the bot check is DISABLED in production (TURNSTILE_ENABLED is not "true").');
}
if (env.turnstile.enabled && env.isProduction && /^[12]x0+AA$/.test(env.turnstile.secretKey)) {
  console.warn('[turnstile] WARNING: a Cloudflare TEST secret key is used in production: the check is not real.');
}
if (env.turnstile.enabled && env.turnstile.loginFailOpen) {
  console.warn('[turnstile] TURNSTILE_LOGIN_FAIL_OPEN=true: logins are let through while Cloudflare is unreachable.');
}

// Serverless: no permanent worker, so each API response gives the queue a
// step (jobs, emails) while the function is still alive.
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    res.on('finish', () => {
      kickWorkAfterRequest().catch((error) => console.error('[worker] kick failed:', error));
    });
    next();
  });
}

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
app.use('/api/public/config', publicConfigRoutes);
app.use('/api/public/inscription', publicInscriptionRoutes);
app.use('/api/public/scan', publicScanRoutes);
app.use('/api/public/scan', publicScanPhotoRoutes);
app.use('/api/images', publicImageRoutes);
app.use('/api/admin', adminImageRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

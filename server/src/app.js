import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authRoutes } from './routes/authRoutes.js';
import { organisateurRoutes } from './routes/organisateurRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/organisateurs', organisateurRoutes);
app.use('/api/admin/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

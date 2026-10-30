import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import { loginRateLimit } from '../middlewares/rateLimit.js';

export const authRoutes = Router();

authRoutes.post('/login', loginRateLimit, login);
authRoutes.post('/logout', logout);
authRoutes.get('/me', requireAuth, me);

import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';
import { loginRateLimit } from '../middlewares/rateLimit.js';
import { requireTurnstile } from '../middlewares/requireTurnstile.js';

export const authRoutes = Router();

// Bot check before the password: bots never reach bcrypt.
authRoutes.post('/login', loginRateLimit, requireTurnstile('login'), login);
authRoutes.post('/logout', logout);
authRoutes.get('/me', requireAuth, me);

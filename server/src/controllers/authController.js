import { z } from 'zod';
import { authenticate } from '../services/authService.js';
import { signAuthToken } from '../services/tokenService.js';
import { AUTH_COOKIE_NAME } from '../middlewares/auth.js';
import { User } from '../models/User.js';
import { ApiError } from '../middlewares/errorHandler.js';

const loginSchema = z.object({
  email: z.string().email('Email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
});

const isProduction = process.env.NODE_ENV === 'production';

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authenticate(email, password);
    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.json({
      id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      organisateurId: user.organisateurId,
    });
  } catch (error) {
    next(error);
  }
}

export function logout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).send();
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);
    if (!user || !user.actif) {
      throw new ApiError(401, 'Session invalide ou expirée.');
    }

    res.json({
      id: user._id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      organisateurId: user.organisateurId,
    });
  } catch (error) {
    next(error);
  }
}

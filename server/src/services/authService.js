import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../middlewares/errorHandler.js';

export async function authenticate(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user || !user.actif) {
    throw new ApiError(401, 'Email ou mot de passe incorrect.');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Email ou mot de passe incorrect.');
  }

  user.dernierLogin = new Date();
  await user.save();

  return user;
}

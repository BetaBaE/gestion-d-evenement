import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetUserPassword,
  deactivateUser,
} from '../controllers/userController.js';

export const userRoutes = Router();

userRoutes.use(requireAuth, requireRole('SUPER_ADMIN'));

userRoutes.get('/', listUsers);
userRoutes.get('/:id', getUser);
userRoutes.post('/', createUser);
userRoutes.put('/:id', updateUser);
userRoutes.post('/:id/reset-password', resetUserPassword);
userRoutes.delete('/:id', deactivateUser);

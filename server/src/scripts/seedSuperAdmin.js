import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

async function main() {
  if (!env.superAdmin.email || !env.superAdmin.password) {
    throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env');
  }

  await connectDb();

  const existing = await User.findOne({ email: env.superAdmin.email });
  if (existing) {
    console.log(`Super admin already exists: ${env.superAdmin.email}`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(env.superAdmin.password, 10);

  await User.create({
    nom: 'Admin',
    prenom: 'Super',
    email: env.superAdmin.email,
    passwordHash,
    role: 'SUPER_ADMIN',
  });

  console.log(`Super admin created: ${env.superAdmin.email}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Failed to seed super admin:', error);
  process.exit(1);
});

import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  // Give up after 10 s (default 30 s) when the cluster is unreachable, e.g.
  // Atlas Network Access not allowing the server's IP.
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');
}

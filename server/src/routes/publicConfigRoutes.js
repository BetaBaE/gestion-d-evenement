import { Router } from 'express';
import { env } from '../config/env.js';

export const publicConfigRoutes = Router();

/**
 * Settings the front end reads at runtime, so a switch (e.g. turning the
 * bot check off) needs no client rebuild. Nothing secret goes here.
 */
publicConfigRoutes.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ turnstile: { enabled: env.turnstile.enabled } });
});

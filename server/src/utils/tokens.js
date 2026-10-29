import crypto from 'node:crypto';

export function generateToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function generateBadgeCode() {
  return crypto.randomBytes(16).toString('hex');
}

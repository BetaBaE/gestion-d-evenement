import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailQuota, estimatedMinutes, classifyEmailError, afterFailure } from './emailRules.js';

test('rate limiter: per-minute limit', () => {
  assert.equal(emailQuota({ sentLastMinute: 0, sentToday: 0, limiteParMinute: 20 }), 20);
  assert.equal(emailQuota({ sentLastMinute: 18, sentToday: 100, limiteParMinute: 20 }), 2);
  assert.equal(emailQuota({ sentLastMinute: 20, sentToday: 100, limiteParMinute: 20 }), 0);
  assert.equal(emailQuota({ sentLastMinute: 25, sentToday: 100, limiteParMinute: 20 }), 0); // never negative
});

test('rate limiter: default 20/min when not configured', () => {
  assert.equal(emailQuota({ sentLastMinute: 5, sentToday: 5 }), 15);
});

test('rate limiter: the daily limit caps the per-minute quota', () => {
  assert.equal(emailQuota({ sentLastMinute: 0, sentToday: 495, limiteParMinute: 20, limiteParJour: 500 }), 5);
  assert.equal(emailQuota({ sentLastMinute: 0, sentToday: 500, limiteParMinute: 20, limiteParJour: 500 }), 0);
});

test('estimated duration', () => {
  assert.equal(estimatedMinutes(0, 20), 0);
  assert.equal(estimatedMinutes(5, 20), 1);
  assert.equal(estimatedMinutes(45, 20), 3);
});

test('error classification', () => {
  assert.equal(classifyEmailError({ code: 'EAUTH', responseCode: 535 }), 'AUTH');
  assert.equal(classifyEmailError({ responseCode: 534 }), 'AUTH'); // Gmail: app password required
  assert.equal(classifyEmailError({ code: 'ETIMEDOUT' }), 'TEMPORAIRE');
  assert.equal(classifyEmailError({ responseCode: 421 }), 'TEMPORAIRE');
  assert.equal(classifyEmailError({ responseCode: 550 }), 'PERMANENT');
});

test('retries: 1 min, 5 min, 15 min, then ECHEC; AUTH and PERMANENT fail at once', () => {
  const now = new Date('2026-11-05T10:00:00Z');
  assert.equal(afterFailure({ erreurType: 'TEMPORAIRE', tentatives: 1, now }).prochainEssai.toISOString(), '2026-11-05T10:01:00.000Z');
  assert.equal(afterFailure({ erreurType: 'TEMPORAIRE', tentatives: 2, now }).prochainEssai.toISOString(), '2026-11-05T10:05:00.000Z');
  assert.equal(afterFailure({ erreurType: 'TEMPORAIRE', tentatives: 3, now }).prochainEssai.toISOString(), '2026-11-05T10:15:00.000Z');
  assert.deepEqual(afterFailure({ erreurType: 'TEMPORAIRE', tentatives: 4, now }), { statut: 'ECHEC' });
  assert.deepEqual(afterFailure({ erreurType: 'AUTH', tentatives: 1, now }), { statut: 'ECHEC' });
  assert.deepEqual(afterFailure({ erreurType: 'PERMANENT', tentatives: 1, now }), { statut: 'ECHEC' });
});

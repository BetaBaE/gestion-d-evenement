import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventDatesError, registrationClosedReason } from './eventDates.js';

const event = { dateDebut: '2026-11-24T08:00:00Z', dateFin: '2026-11-25T17:00:00Z' };

test('valid dates → no error', () => {
  assert.equal(eventDatesError(event), null);
  assert.equal(eventDatesError({ ...event, dateLimiteInscription: '2026-11-20T23:59:00Z' }), null);
  // deadline during the event is allowed
  assert.equal(eventDatesError({ ...event, dateLimiteInscription: '2026-11-25T12:00:00Z' }), null);
});

test('end before start → error', () => {
  assert.match(eventDatesError({ dateDebut: event.dateFin, dateFin: event.dateDebut }), /fin doit être après/);
});

test('deadline after the end of the event → error', () => {
  assert.match(eventDatesError({ ...event, dateLimiteInscription: '2026-11-26T09:00:00Z' }), /ne peut pas dépasser la fin/);
});

test('registration closes when the event is over, even without a deadline', () => {
  assert.equal(registrationClosedReason(event, new Date('2026-11-25T16:00:00Z')), null);
  assert.match(registrationClosedReason(event, new Date('2026-11-25T17:01:00Z')), /terminé/);
});

test('registration closes after the deadline', () => {
  const e = { ...event, dateLimiteInscription: '2026-11-20T23:59:00Z' };
  assert.match(registrationClosedReason(e, new Date('2026-11-21T08:00:00Z')), /date limite/);
  assert.equal(registrationClosedReason(e, new Date('2026-11-19T08:00:00Z')), null);
});

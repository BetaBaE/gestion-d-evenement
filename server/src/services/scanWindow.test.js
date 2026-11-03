import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getScanWindow, isScanTestActive, formatScanDate } from './scanWindow.js';

const TZ = 'Africa/Casablanca'; // UTC+1 in November 2026
// Event on 3 Nov 2026, 09:00–18:00 local.
const event = { dateDebut: new Date('2026-11-03T08:00:00Z'), dateFin: new Date('2026-11-03T17:00:00Z') };

test('AUTO: before the first day → PAS_ENCORE', () => {
  const w = getScanWindow(event, new Date('2026-11-02T20:00:00Z'), TZ);
  assert.equal(w.status, 'PAS_ENCORE');
  assert.equal(w.mode, 'AUTO');
});

test('AUTO: window is the whole local day, not the UTC day', () => {
  const w = getScanWindow(event, new Date('2026-11-03T10:00:00Z'), TZ);
  assert.equal(w.status, 'ACTIF');
  assert.equal(w.from.toISOString(), '2026-11-02T23:00:00.000Z'); // 00:00 Casablanca
  assert.equal(w.until.toISOString(), '2026-11-03T22:59:59.999Z'); // 23:59:59.999 Casablanca
});

test('AUTO: 00:30 local on the first day is already open (UTC would still be the day before)', () => {
  assert.equal(getScanWindow(event, new Date('2026-11-02T23:30:00Z'), TZ).status, 'ACTIF');
});

test('AUTO: 23:30 local on the last day is open, 00:01 the next day is closed', () => {
  assert.equal(getScanWindow(event, new Date('2026-11-03T22:30:00Z'), TZ).status, 'ACTIF');
  assert.equal(getScanWindow(event, new Date('2026-11-03T22:59:59Z'), TZ).status, 'ACTIF'); // last minute
  assert.equal(getScanWindow(event, new Date('2026-11-03T23:01:00Z'), TZ).status, 'EXPIRE');
});

test('AUTO: follows the current dates (a past event moved to today opens without regenerating)', () => {
  const past = { ...event, scanTokenValidFrom: new Date('2026-10-29T17:19:10Z'), scanTokenValidUntil: new Date('2026-10-29T19:19:10Z') };
  assert.equal(getScanWindow(past, new Date('2026-11-03T12:00:00Z'), TZ).status, 'ACTIF');
});

test('MANUEL: uses the stored window, ignoring the dates', () => {
  const manual = {
    ...event,
    scanWindowMode: 'MANUEL',
    scanTokenValidFrom: new Date('2026-11-03T12:00:00Z'),
    scanTokenValidUntil: new Date('2026-11-03T14:00:00Z'),
  };
  assert.equal(getScanWindow(manual, new Date('2026-11-03T10:00:00Z'), TZ).status, 'PAS_ENCORE');
  assert.equal(getScanWindow(manual, new Date('2026-11-03T13:00:00Z'), TZ).status, 'ACTIF');
  assert.equal(getScanWindow(manual, new Date('2026-11-03T15:00:00Z'), TZ).status, 'EXPIRE');
  assert.equal(getScanWindow(manual, new Date('2026-11-03T13:00:00Z'), TZ).mode, 'MANUEL');
});

test('MANUEL without a stored window falls back to AUTO', () => {
  const w = getScanWindow({ ...event, scanWindowMode: 'MANUEL' }, new Date('2026-11-03T10:00:00Z'), TZ);
  assert.equal(w.mode, 'AUTO');
  assert.equal(w.status, 'ACTIF');
});

test('time zone changes the day boundaries', () => {
  // 23:30 UTC on 3 Nov is 4 Nov in Casablanca but still 3 Nov in UTC.
  const at = new Date('2026-11-03T23:30:00Z');
  assert.equal(getScanWindow(event, at, TZ).status, 'EXPIRE');
  assert.equal(getScanWindow(event, at, 'UTC').status, 'ACTIF');
});

test('test mode is active until scanTestJusquA', () => {
  const e = { scanTestJusquA: new Date('2026-11-03T12:00:00Z') };
  assert.equal(isScanTestActive(e, new Date('2026-11-03T11:59:00Z')), true);
  assert.equal(isScanTestActive(e, new Date('2026-11-03T12:00:01Z')), false);
  assert.equal(isScanTestActive({}, new Date()), false);
});

test('dates are formatted in the app time zone', () => {
  assert.equal(formatScanDate(new Date('2026-11-03T22:59:00Z'), TZ), '3 nov. 2026 à 23:59');
});

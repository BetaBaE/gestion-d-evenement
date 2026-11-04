import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyScan } from './scanResult.js';

const now = new Date('2026-11-24T10:32:00Z');
const valide = { statut: 'VALIDE' };
const ago = (seconds) => ({ horodatage: new Date(now.getTime() - seconds * 1000) });

test('unknown badge → INCONNU', () => {
  assert.deepEqual(classifyScan({ participant: null, now, antiDoublonMinutes: 2 }), { result: 'INCONNU' });
});

test('pending or refused participant → NON_VALIDE with the status', () => {
  assert.deepEqual(classifyScan({ participant: { statut: 'EN_ATTENTE' }, now, antiDoublonMinutes: 2 }), { result: 'NON_VALIDE', statut: 'EN_ATTENTE' });
  assert.deepEqual(classifyScan({ participant: { statut: 'REFUSE' }, lastScan: ago(10), now, antiDoublonMinutes: 2 }), { result: 'NON_VALIDE', statut: 'REFUSE' });
});

test('second scan within the anti-duplicate window → DEJA_SCANNE with time since', () => {
  const r = classifyScan({ participant: valide, lastScan: ago(40), now, antiDoublonMinutes: 2 });
  assert.equal(r.result, 'DEJA_SCANNE');
  assert.equal(r.dernierScanIlYa, 40);
  assert.equal(r.dernierScanA.toISOString(), '2026-11-24T10:31:20.000Z');
});

test('first scan, or scan after the window → OK (re-entry)', () => {
  assert.deepEqual(classifyScan({ participant: valide, lastScan: null, now, antiDoublonMinutes: 2 }), { result: 'OK' });
  assert.deepEqual(classifyScan({ participant: valide, lastScan: ago(120), now, antiDoublonMinutes: 2 }), { result: 'OK' });
  assert.deepEqual(classifyScan({ participant: valide, lastScan: ago(3600), now, antiDoublonMinutes: 2 }), { result: 'OK' });
});

test('window edge: 119 s is a duplicate, 120 s is a new entry', () => {
  assert.equal(classifyScan({ participant: valide, lastScan: ago(119), now, antiDoublonMinutes: 2 }).result, 'DEJA_SCANNE');
  assert.equal(classifyScan({ participant: valide, lastScan: ago(120), now, antiDoublonMinutes: 2 }).result, 'OK');
});

test('a last scan in the future never blocks an entry', () => {
  assert.equal(classifyScan({ participant: valide, lastScan: ago(-30), now, antiDoublonMinutes: 2 }).result, 'OK');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { normalizeSelection, MAX_SELECTION } from './participantFilter.js';

const id = () => String(new mongoose.Types.ObjectId());

test('ids selection: deduplicated and validated', () => {
  const a = id();
  assert.deepEqual(normalizeSelection({ mode: 'ids', ids: [a, a] }), { mode: 'ids', ids: [a] });
  assert.match(normalizeSelection({ mode: 'ids', ids: [] }).erreur, /Aucun participant/);
  assert.match(normalizeSelection({ mode: 'ids', ids: ['pas-un-id'] }).erreur, /invalide/);
});

test(`ids selection: more than ${MAX_SELECTION} → clear message`, () => {
  const ids = Array.from({ length: MAX_SELECTION + 1 }, id);
  assert.match(normalizeSelection({ mode: 'ids', ids }).erreur, /limitée à 2000/);
  assert.equal(normalizeSelection({ mode: 'ids', ids: ids.slice(0, MAX_SELECTION) }).ids.length, MAX_SELECTION);
});

test('filter selection: only known filters are kept, empty ones dropped', () => {
  assert.deepEqual(normalizeSelection({ mode: 'filtre', filtre: { statut: 'EN_ATTENTE', invitedOrganismId: 'x', search: '', page: 3, $where: 'evil' } }), {
    mode: 'filtre',
    filtre: { statut: 'EN_ATTENTE', invitedOrganismId: 'x' },
  });
});

test('missing or unknown selection → error', () => {
  assert.ok(normalizeSelection(null).erreur);
  assert.ok(normalizeSelection({ mode: 'tout' }).erreur);
});

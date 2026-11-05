import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortForPrint, separatorGroups, impositionGrid, planParts } from './printPlan.js';

const P = (id, nom, prenom, org, cat, createdAt) => ({ _id: id, nom, prenom, invitedOrganismId: org, categorieId: cat, createdAt });
const people = [
  P('1', 'Zahir', 'Ali', 'o2', 'c1', '2026-01-03'),
  P('2', 'alami', 'Sara', 'o1', 'c2', '2026-01-01'),
  P('3', 'Élbaz', 'Omar', 'o2', 'c2', '2026-01-02'),
  P('4', 'Alami', 'Adam', 'o1', 'c1', '2026-01-04'),
];
const names = { organisme: new Map([['o1', 'ONEE'], ['o2', 'Anapec']]), categorie: new Map([['c1', 'VIP'], ['c2', 'Exposant']]) };
const ids = (list) => list.map((p) => p._id);

test('sortForPrint: organisme name, then nom/prénom (accents and case ignored)', () => {
  assert.deepEqual(ids(sortForPrint(people, 'ORGANISME_NOM', names)), ['3', '1', '4', '2']);
});

test('sortForPrint: by nom, catégorie, inscription', () => {
  assert.deepEqual(ids(sortForPrint(people, 'NOM', names)), ['4', '2', '3', '1']);
  assert.deepEqual(ids(sortForPrint(people, 'CATEGORIE_NOM', names)), ['2', '3', '4', '1']);
  assert.deepEqual(ids(sortForPrint(people, 'INSCRIPTION', names)), ['2', '3', '1', '4']);
});

test('sortForPrint does not mutate its input', () => {
  const copy = [...people];
  sortForPrint(people, 'NOM', names);
  assert.deepEqual(people, copy);
});

test('separatorGroups: consecutive runs of the same organisme', () => {
  assert.deepEqual(separatorGroups(['a', 'a', 'b', 'a']), [
    { start: 0, count: 2, key: 'a' },
    { start: 2, count: 1, key: 'b' },
    { start: 3, count: 1, key: 'a' },
  ]);
  assert.deepEqual(separatorGroups([]), []);
});

test('impositionGrid: credit-card badges → 2 × 5 per A4, centred', () => {
  const g = impositionGrid({ cardW: 85.6, cardH: 54 });
  assert.equal(g.cols, 2);
  assert.equal(g.rows, 5);
  assert.equal(g.perSheet, 10);
  assert.ok(Math.abs(g.offsetX - 19.4) < 1e-9);
  assert.ok(Math.abs(g.offsetY - 13.5) < 1e-9);
});

test('impositionGrid: a card larger than the sheet → null', () => {
  assert.equal(impositionGrid({ cardW: 300, cardH: 54 }), null);
});

test('planParts: splits under the limit; no limit → one part; oversized chunk alone', () => {
  assert.deepEqual(planParts([1, 2, 3, 4], 5), [[0, 1], [2], [3]]);
  assert.deepEqual(planParts([1, 2, 3], Infinity), [[0, 1, 2]]);
  assert.deepEqual(planParts([9, 1], 5), [[0], [1]]);
  assert.deepEqual(planParts([], 5), []);
});

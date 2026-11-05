import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoValidates } from './validationRules.js';

const p = { categorieId: 'cat-vip', invitedOrganismId: 'org-onee' };

test('manual (or missing) mode never auto-validates', () => {
  assert.equal(autoValidates(undefined, p), false);
  assert.equal(autoValidates({}, p), false);
  assert.equal(autoValidates({ mode: 'MANUELLE', categorieIds: ['cat-vip'] }, p), false);
});

test('automatic mode validates everyone', () => {
  assert.equal(autoValidates({ mode: 'AUTOMATIQUE' }, p), true);
  assert.equal(autoValidates({ mode: 'AUTOMATIQUE' }, {}), true);
});

test('partial mode: listed catégorie OR listed organisme', () => {
  assert.equal(autoValidates({ mode: 'AUTOMATIQUE_PARTIEL', categorieIds: ['cat-vip'] }, p), true);
  assert.equal(autoValidates({ mode: 'AUTOMATIQUE_PARTIEL', organismeIds: ['org-onee'] }, p), true);
  assert.equal(autoValidates({ mode: 'AUTOMATIQUE_PARTIEL', categorieIds: ['cat-x'], organismeIds: ['org-y'] }, p), false);
  assert.equal(autoValidates({ mode: 'AUTOMATIQUE_PARTIEL' }, p), false);
});

test('partial mode compares ids as strings (ObjectId vs string)', () => {
  const oid = { toString: () => 'cat-vip' };
  assert.equal(autoValidates({ mode: 'AUTOMATIQUE_PARTIEL', categorieIds: [oid] }, p), true);
  assert.equal(autoValidates({ mode: 'AUTOMATIQUE_PARTIEL', categorieIds: ['cat-vip'] }, { categorieId: undefined }), false);
});

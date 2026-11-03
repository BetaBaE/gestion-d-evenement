import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBadgeRules, hasBlockingRules } from './rules.js';
import { activePanelKeys, elementsHorsPage } from './panels.js';

const el = (type, panneau, props = {}, extra = {}) => ({ id: `${type}-${panneau}`, type, panneau, props, ...extra });
const codes = (badge) => checkBadgeRules(badge).map((r) => `${r.niveau}:${r.code}`);

test('blank template: name and QR code are blocking, with a one-click fix', () => {
  const badge = { format: 'A4_PLIE_4', elements: [] };
  const rules = checkBadgeRules(badge);
  assert.deepEqual(codes(badge), ['bloquant:NOM_MANQUANT', 'bloquant:QR_MANQUANT']);
  assert.deepEqual(rules[0].correction, { type: 'champ', props: { champ: 'nomPrenom' } });
  assert.deepEqual(rules[1].correction, { type: 'qrCode', props: {} });
  assert.equal(hasBlockingRules(badge), true);
});

test('name + QR on P1 → nothing to fix', () => {
  const badge = { format: 'A4_PLIE_4', elements: [el('champ', 'P1', { champ: 'nomPrenom' }), el('qrCode', 'P1')] };
  assert.deepEqual(codes(badge), []);
  assert.equal(hasBlockingRules(badge), false);
});

test('"nom" alone counts as the name; prénom alone does not', () => {
  assert.ok(!codes({ format: 'CARTE', elements: [el('champ', 'P1', { champ: 'nom' }), el('qrCode', 'P1')] }).includes('bloquant:NOM_MANQUANT'));
  assert.ok(codes({ format: 'CARTE', elements: [el('champ', 'P1', { champ: 'prenom' }), el('qrCode', 'P1')] }).includes('bloquant:NOM_MANQUANT'));
});

test('QR code on P2 of an A4 folded badge → warning, not blocking', () => {
  const badge = { format: 'A4_PLIE_4', elements: [el('champ', 'P1', { champ: 'nomPrenom' }), el('qrCode', 'P2')] };
  assert.deepEqual(codes(badge), ['avertissement:QR_HORS_P1']);
});

test('hidden elements and elements on inactive panels do not count', () => {
  const badge = {
    format: 'A4_PLIE_4',
    panneauxActifs: ['P2'],
    elements: [el('champ', 'P1', { champ: 'nomPrenom' }, { masque: true }), el('qrCode', 'P3')],
  };
  assert.deepEqual(codes(badge), ['bloquant:NOM_MANQUANT', 'bloquant:QR_MANQUANT', 'avertissement:HORS_PAGE']);
});

test('active panels: A4 defaults to all four, P1 always kept; single-panel formats only P1', () => {
  assert.deepEqual(activePanelKeys({ format: 'A4_PLIE_4' }), ['P1', 'P2', 'P3', 'P4']);
  assert.deepEqual(activePanelKeys({ format: 'A4_PLIE_4', panneauxActifs: ['P3'] }), ['P1', 'P3']);
  assert.deepEqual(activePanelKeys({ format: 'CARTE' }), ['P1']);
  assert.deepEqual(elementsHorsPage({ format: 'A6', elements: [el('texte', 'P1'), el('texte', 'P4')] }).map((e) => e.panneau), ['P4']);
});

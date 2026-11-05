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

const box = (type, x, y, w, h, extra = {}) => ({ id: `${type}-${x}-${y}`, type, panneau: 'P1', x, y, largeur: w, hauteur: h, props: {}, ...extra });
const nom = (min = 12) => box('champ', 10, 10, 60, 12, { props: { champ: 'nomPrenom' }, style: { tailleMin: min } });
const codesOf = (badge) => checkBadgeRules(badge).map((r) => `${r.niveau}:${r.code}`);

test('QR code: under 30 mm blocks, under 45 mm warns, must be square', () => {
  assert.ok(codesOf({ format: 'A6', elements: [nom(), box('qrCode', 10, 40, 25, 25)] }).includes('bloquant:QR_TROP_PETIT'));
  assert.deepEqual(codesOf({ format: 'A6', elements: [nom(), box('qrCode', 10, 40, 35, 35)] }), ['avertissement:QR_PETIT']);
  assert.deepEqual(codesOf({ format: 'A6', elements: [nom(), box('qrCode', 10, 40, 45, 45)] }), []);
  assert.ok(codesOf({ format: 'A6', elements: [nom(), box('qrCode', 10, 40, 45, 50)] }).includes('bloquant:QR_NON_CARRE'));
});

test('QR code covered by an element above it blocks; a card below it does not', () => {
  const qr = box('qrCode', 10, 40, 45, 45, { z: 5 });
  assert.deepEqual(codesOf({ format: 'A6', elements: [nom(), qr, box('forme', 8, 38, 50, 50, { z: 4 })] }), []);
  assert.ok(codesOf({ format: 'A6', elements: [nom(), qr, box('texte', 20, 50, 20, 10, { z: 6 })] }).includes('bloquant:QR_COUVERT'));
});

test('exactly one QR code on P1', () => {
  const elements = [nom(), box('qrCode', 10, 40, 45, 45), box('qrCode', 55, 90, 45, 45)];
  assert.ok(codesOf({ format: 'A6', elements }).includes('bloquant:QR_MULTIPLE'));
});

test('safe zone: content warns, full-bleed backgrounds and bands do not', () => {
  const ok = [nom(), box('qrCode', 10, 40, 45, 45), box('forme', 0, 0, 105, 20), box('bandeCategorie', 0, 138.5, 105, 10)];
  assert.deepEqual(codesOf({ format: 'A6', safeZoneMm: 5, elements: ok }), []);
  assert.deepEqual(codesOf({ format: 'A6', safeZoneMm: 5, elements: [...ok, box('texte', 2, 30, 50, 5)] }), ['avertissement:HORS_ZONE_SURE']);
  // card format: its own size and safe zone
  assert.deepEqual(codesOf({ format: 'CARTE', carteLargeurMm: 85.6, carteHauteurMm: 54, safeZoneMm: 3, elements: [nom(), box('qrCode', 52.6, 13, 30, 30)] }), ['avertissement:QR_PETIT']);
});

test('text that can shrink under 6 pt and a name under 12 pt warn', () => {
  const base = [box('qrCode', 10, 40, 45, 45)];
  assert.deepEqual(codesOf({ format: 'A6', elements: [...base, nom(10)] }), ['avertissement:NOM_PETIT']);
  assert.deepEqual(codesOf({ format: 'A6', elements: [...base, nom(), box('texte', 10, 100, 50, 5, { style: { tailleMin: 5 } })] }), ['avertissement:TEXTE_TROP_PETIT']);
});

test('a small logo in the middle of the QR code only warns', () => {
  const qr = box('qrCode', 10, 40, 79, 79, { z: 1 });
  assert.deepEqual(codesOf({ format: 'A6', elements: [nom(), qr, box('icone', 47, 77, 8, 8, { z: 6 })] }), ['avertissement:QR_PARTIELLEMENT_COUVERT']);
});

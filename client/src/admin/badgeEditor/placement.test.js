import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickActivePanel, panelAtSheetPoint, placeNewElement, placePastedElements } from './placement.js';

const a4 = { format: 'A4_PLIE_4', safeZoneMm: 5 }; // panels 105 × 148.5
const card = { format: 'CARTE', largeurMm: 85.6, hauteurMm: 54, safeZoneMm: 3 };

test('active panel: selection > last click > visible centre > P1', () => {
  assert.equal(pickActivePanel({ badge: a4, selectedPanel: 'P3', lastClickedPanel: 'P4', centerPanel: 'P2' }), 'P3');
  assert.equal(pickActivePanel({ badge: a4, lastClickedPanel: 'P4', centerPanel: 'P2' }), 'P4');
  assert.equal(pickActivePanel({ badge: a4, centerPanel: 'P2' }), 'P2');
  assert.equal(pickActivePanel({ badge: a4 }), 'P1');
  // P3 doesn't exist on a single-panel badge.
  assert.equal(pickActivePanel({ badge: card, lastClickedPanel: 'P3' }), 'P1');
});

test('panel under a sheet point, in panel coordinates', () => {
  assert.deepEqual(panelAtSheetPoint(a4, 150, 200), { panneau: 'P4', x: 45, y: 51.5 });
  assert.deepEqual(panelAtSheetPoint(a4, 10, 10), { panneau: 'P1', x: 10, y: 10 });
  assert.equal(panelAtSheetPoint(a4, 300, 10), null);
});

test('new element is centred in the safe zone', () => {
  const p = placeNewElement({ badge: a4, panneau: 'P4', elements: [], size: { largeur: 40, hauteur: 10 } });
  assert.deepEqual(p, { x: 32.5, y: 69.3, largeur: 40, hauteur: 10 });
});

test('adding the same element 3 times cascades by +3 mm', () => {
  const elements = [];
  for (let i = 0; i < 3; i += 1) {
    const p = placeNewElement({ badge: a4, panneau: 'P2', elements, size: { largeur: 40, hauteur: 10 } });
    elements.push({ panneau: 'P2', ...p });
  }
  assert.deepEqual(elements.map((e) => [e.x, e.y]), [[32.5, 69.3], [35.5, 72.3], [38.5, 75.3]]);
});

test('an element on another panel at the same spot does not cause a cascade', () => {
  const elements = [{ panneau: 'P1', x: 32.5, y: 69.3 }];
  const p = placeNewElement({ badge: a4, panneau: 'P2', elements, size: { largeur: 40, hauteur: 10 } });
  assert.deepEqual([p.x, p.y], [32.5, 69.3]);
});

test('drop point: centred on the point, kept inside the panel', () => {
  const p = placeNewElement({ badge: a4, panneau: 'P2', elements: [], size: { largeur: 30, hauteur: 30 }, at: { x: 20, y: 40 } });
  assert.deepEqual([p.x, p.y], [5, 25]);
  const edge = placeNewElement({ badge: a4, panneau: 'P2', elements: [], size: { largeur: 30, hauteur: 30 }, at: { x: 104, y: 147 } });
  assert.deepEqual([edge.x, edge.y], [75, 118.5]);
});

test('too big for the panel → scaled down to the safe zone, ratio kept', () => {
  const p = placeNewElement({ badge: card, panneau: 'P1', elements: [], size: { largeur: 95, hauteur: 110 } });
  assert.equal(p.hauteur, 48); // 54 - 2 × 3
  assert.equal(p.largeur, round(95 * (48 / 110)));
  assert.ok(p.x >= 0 && p.x + p.largeur <= 85.6);
});

test('full-width band spans the panel and cascades vertically only', () => {
  const first = placeNewElement({ badge: a4, panneau: 'P1', elements: [], size: { largeur: 95, hauteur: 10 }, fullWidth: true });
  assert.deepEqual([first.x, first.largeur], [0, 105]);
  const second = placeNewElement({ badge: a4, panneau: 'P1', elements: [{ panneau: 'P1', ...first }], size: { largeur: 95, hauteur: 10 }, fullWidth: true });
  assert.deepEqual([second.x, second.y], [0, first.y + 3]);
});

test('paste keeps relative positions when the set fits, otherwise centres it', () => {
  const source = [
    { x: 10, y: 10, largeur: 20, hauteur: 10 },
    { x: 40, y: 30, largeur: 20, hauteur: 10 },
  ];
  assert.deepEqual(placePastedElements({ badge: a4, source }), [{ x: 10, y: 10 }, { x: 40, y: 30 }]);
  // Copied from a bigger badge: doesn't fit a card at the same place → centred.
  const far = [{ x: 70, y: 60, largeur: 20, hauteur: 10 }];
  assert.deepEqual(placePastedElements({ badge: card, source: far }), [{ x: 32.8, y: 22 }]);
});

function round(v) {
  return Math.round(v * 10) / 10;
}

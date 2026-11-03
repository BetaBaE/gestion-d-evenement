import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS, renderBadgeHtml } from './index.js';
import { getElementDefinition } from './registry.js';

// Keys already stored in badges before the SVG icons replaced the emoji.
const LEGACY_KEYS = ['calendrier', 'horloge', 'lieu', 'ticket', 'itineraire', 'info', 'telephone', 'email', 'web', 'wifi', 'repas', 'parking', 'facebook', 'instagram', 'linkedin', 'youtube', 'x'];

test('every icon key used by existing badges still exists', () => {
  LEGACY_KEYS.forEach((key) => assert.ok(ICONS[key], `missing icon ${key}`));
});

test('every icon has a label, a group and SVG shapes only', () => {
  Object.entries(ICONS).forEach(([key, icon]) => {
    assert.ok(icon.label && icon.groupe, key);
    assert.match(icon.svg, /^(<(path|circle|rect|ellipse) [^<>]*\/>)+$/, key);
  });
});

test('icons render as SVG in the element color, unknown ones are refused', () => {
  const def = getElementDefinition('icone');
  assert.equal(def.validateProps({ icone: 'nope' }).valid, false);
  assert.equal(def.validateProps({ icone: 'constructor' }).valid, false);
  const html = renderBadgeHtml({
    badge: { format: 'CARTE', elements: [{ id: 'i', type: 'icone', panneau: 'P1', x: 1, y: 1, largeur: 8, hauteur: 8, props: { icone: 'lieu' }, style: { couleur: '#E03131' } }] },
    theme: {},
    participant: {},
    event: {},
    assets: {},
  });
  assert.match(html, /<svg class="el-icone" viewBox="0 0 24 24" fill="currentColor"/);
  assert.match(html, /color:#E03131/);
  assert.doesNotMatch(html, /📍/);
});

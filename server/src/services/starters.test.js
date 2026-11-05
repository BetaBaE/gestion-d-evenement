import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTemplateFile } from './templateTransfer.js';
import { STARTER_TEMPLATES, DEFAULT_STARTER_KEY, checkBadgeRules, renderBadgeHtml } from '../../../shared/badge-renderer/index.js';

const EXPECTED = { signal: ['Signal', 'A4_PLIE_4'], gala: ['Gala', 'A4_PLIE_4'], epure: ['Épure', 'A6'], pass: ['Pass', 'CARTE'] };

test('exactly the 4 starters, in gallery order, with a stable key and a version', () => {
  assert.deepEqual(Object.keys(STARTER_TEMPLATES), ['signal', 'gala', 'epure', 'pass']);
  for (const [key, [nom, format]] of Object.entries(EXPECTED)) {
    const s = STARTER_TEMPLATES[key];
    assert.equal(s.key, key);
    assert.equal(s.label, nom);
    assert.equal(s.format, format);
    assert.ok(Number.isInteger(s.starterVersion) && s.starterVersion >= 1);
    assert.ok(s.description.length > 20);
  }
  assert.ok(STARTER_TEMPLATES[DEFAULT_STARTER_KEY]);
});

for (const key of Object.keys(EXPECTED)) {
  test(`starter "${key}" passes the import validation and has 0 blocking rule`, () => {
    // Same path as a user import: schema version, zod schema, element props, references.
    const file = parseTemplateFile(Buffer.from(JSON.stringify(STARTER_TEMPLATES[key].file())));
    const bloquants = checkBadgeRules(file.modele).filter((r) => r.niveau === 'bloquant');
    assert.deepEqual(bloquants, []);
    // One QR on P1 and the name on P1.
    const p1 = file.modele.elements.filter((e) => e.panneau === 'P1' && !e.masque);
    assert.equal(p1.filter((e) => e.type === 'qrCode').length, 1);
    assert.ok(p1.some((e) => e.type === 'champ' && e.props.champ === 'nomPrenom'));
    // Every minimum text size is printable (≥ 6 pt).
    for (const e of file.modele.elements) {
      if (e.style?.tailleMin !== undefined) assert.ok(e.style.tailleMin >= 6, `${key}/${e.id} tailleMin ${e.style.tailleMin}`);
    }
  });

  test(`starter "${key}" renders; build() returns an independent copy`, () => {
    const badge = STARTER_TEMPLATES[key].build();
    const html = renderBadgeHtml({
      badge,
      theme: badge.theme,
      participant: { nom: 'El Idrissi Benkirane', prenom: 'Amina', fonction: 'Directrice des opérations' },
      organisme: { nom: "Office National de l'Eau et de l'Électricité" },
      categorie: { nom: 'VIP', couleur: '#C2410C' },
      event: { titre: 'Salon', dateDebut: '2026-11-18T08:00:00Z', dateFin: '2026-11-20T17:00:00Z', ville: 'Rabat' },
      organisateur: { nom: 'AMEPA' },
      assets: { qrCodeSvg: '<svg></svg>' },
    });
    assert.match(html, /Amina EL IDRISSI BENKIRANE/);
    assert.ok(!/\{\{[a-z]+\.[a-z]+\}\}/i.test(html), 'unresolved variable in the output');
    badge.elements[0].x = 999;
    assert.notEqual(STARTER_TEMPLATES[key].build().elements[0].x, 999);
  });
}

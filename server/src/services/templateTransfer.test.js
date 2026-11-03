import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTemplateFile, SCHEMA_VERSION } from './templateTransfer.js';

const IMG = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const element = (extra) => ({ id: 'e1', type: 'image', panneau: 'P1', x: 0, y: 0, largeur: 10, hauteur: 10, props: { imageId: IMG }, ...extra });
const validFile = () => ({
  application: 'gestion-evenements-badges',
  schemaVersion: SCHEMA_VERSION,
  modele: { nom: 'Salon', format: 'A4_PLIE_4', elements: [element()] },
  images: { [IMG]: { type: 'BLOC_IMAGE', mimeType: 'image/webp', data: 'UklGRg==' } },
  partenaires: {},
});
const buf = (obj) => Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj));
const rejects = (input, pattern) =>
  assert.throws(() => parseTemplateFile(buf(input)), (err) => err.statusCode === 400 && pattern.test(err.message));

test('a valid file parses', () => {
  const file = parseTemplateFile(buf(validFile()));
  assert.equal(file.modele.nom, 'Salon');
  assert.equal(file.modele.elements.length, 1);
});

test('not JSON → clear error', () => rejects('{oops', /illisible/));

test('no schemaVersion → clear error', () => {
  const f = validFile();
  delete f.schemaVersion;
  rejects(f, /version du format absente/);
});

test('future schema version → asks to update the application', () => rejects({ ...validFile(), schemaVersion: SCHEMA_VERSION + 1 }, /plus récente/));

test('file from another application → rejected', () => rejects({ ...validFile(), application: 'autre' }, /ne vient pas de cette application/));

test('element pointing to an image missing from the file → incomplete', () => {
  const f = validFile();
  f.images = {};
  rejects(f, /incomplet/);
});

test('invalid element (unknown panel) → invalid file', () => {
  const f = validFile();
  f.modele.elements = [element({ panneau: 'P9' })];
  rejects(f, /invalide/);
});

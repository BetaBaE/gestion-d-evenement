import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHex } from './colorUtils.js';

test('expands #RGB and uppercases', () => {
  assert.equal(normalizeHex('#1a2'), '#11AA22');
  assert.equal(normalizeHex('fff'), '#FFFFFF');
});

test('normalizes #RRGGBB with or without #', () => {
  assert.equal(normalizeHex('#1971c2'), '#1971C2');
  assert.equal(normalizeHex(' 1971C2 '), '#1971C2');
});

test('rejects invalid values', () => {
  for (const bad of ['', '#12', '#12345', '#1234567', 'red', '#GGGGGG', null, undefined, 42]) {
    assert.equal(normalizeHex(bad), null, `expected null for ${String(bad)}`);
  }
});

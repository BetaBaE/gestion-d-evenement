import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitText } from './textFit.js';

// Deterministic fake measurer: every character is exactly 0.5mm wide at
// 10pt, scaling linearly with font size — lets the shrink/wrap/truncate
// logic be tested exactly without needing real font metrics.
function fakeMeasure(text, fontSizePt) {
  return text.length * 0.5 * (fontSizePt / 10);
}

test('short text that fits on one line at max size', () => {
  const result = fitText('Jean Dupont', { widthMm: 40, heightMm: 10 }, { tailleMax: 14, tailleMin: 8, lignesMax: 1 }, fakeMeasure);
  assert.equal(result.fontSizePt, 14);
  assert.deepEqual(result.lines, ['Jean Dupont']);
  assert.equal(result.truncated, false);
});

test('shrinks font size until text fits in one line', () => {
  // "Jean Dupont" = 11 chars, fakeMeasure width = 11 * 0.5 * (pt/10) mm.
  // At tailleMax=14pt that's 7.7mm, wider than the 6mm box, so the
  // algorithm must shrink below 14pt to fit.
  const result = fitText('Jean Dupont', { widthMm: 6, heightMm: 10 }, { tailleMax: 14, tailleMin: 6, lignesMax: 1 }, fakeMeasure);
  assert.ok(result.fontSizePt < 14, `expected shrunk font size, got ${result.fontSizePt}`);
  assert.equal(result.lines.length, 1);
  assert.ok(fakeMeasure(result.lines[0], result.fontSizePt) <= 6.01);
});

test('wraps onto a second line when lignesMax allows it', () => {
  // Wide box isn't available, but a tall box with lignesMax=2 should wrap
  // instead of just shrinking indefinitely.
  const result = fitText(
    'Jean Alexandre Dupont-Martin',
    { widthMm: 10, heightMm: 20 },
    { tailleMax: 10, tailleMin: 10, lignesMax: 2, interligne: 1 },
    fakeMeasure,
  );
  assert.equal(result.lines.length, 2);
  assert.equal(result.truncated, false);
  // Rejoining the wrapped lines should reconstruct the original words.
  assert.equal(result.lines.join(' '), 'Jean Alexandre Dupont-Martin');
});

test('truncates with an ellipsis when text cannot fit even at tailleMin', () => {
  const result = fitText(
    'Un Nom Vraiment Beaucoup Trop Long Pour Cette Toute Petite Boite',
    { widthMm: 8, heightMm: 5 },
    { tailleMax: 10, tailleMin: 10, lignesMax: 1 },
    fakeMeasure,
  );
  assert.equal(result.truncated, true);
  assert.ok(result.lines[result.lines.length - 1].endsWith('…'));
});

test('empty text returns no lines and is not truncated', () => {
  const result = fitText('', { widthMm: 40, heightMm: 10 }, { tailleMax: 14, tailleMin: 8, lignesMax: 1 }, fakeMeasure);
  assert.deepEqual(result.lines, []);
  assert.equal(result.truncated, false);
});

test('whitespace-only text is treated as empty', () => {
  const result = fitText('   ', { widthMm: 40, heightMm: 10 }, { tailleMax: 14, tailleMin: 8, lignesMax: 1 }, fakeMeasure);
  assert.deepEqual(result.lines, []);
});

test('collapses internal whitespace runs before fitting', () => {
  const result = fitText('Jean    Dupont', { widthMm: 40, heightMm: 10 }, { tailleMax: 14, tailleMin: 8, lignesMax: 1 }, fakeMeasure);
  assert.deepEqual(result.lines, ['Jean Dupont']);
});

test('a single word wider than the box still produces one line, eventually truncated', () => {
  const result = fitText(
    'Supercalifragilisticexpialidocious',
    { widthMm: 5, heightMm: 20 },
    { tailleMax: 10, tailleMin: 10, lignesMax: 3 },
    fakeMeasure,
  );
  assert.equal(result.lines.length, 1);
  assert.ok(result.lines[0].endsWith('…'));
});

test('never returns a font size below tailleMin', () => {
  const result = fitText(
    'Texte extremement long qui ne rentrera jamais',
    { widthMm: 1, heightMm: 1 },
    { tailleMax: 20, tailleMin: 6, lignesMax: 1 },
    fakeMeasure,
  );
  assert.equal(result.fontSizePt, 6);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, historyReducer as reduce, undoLabel, redoLabel } from './editorHistory.js';

const doc = () => ({
  elements: [{ id: 'a', type: 'texte', x: 1, style: { couleur: '#000000' } }, { id: 'b', type: 'qrCode', x: 5, style: {} }],
  theme: { couleurPrincipale: '#111111', policeTexte: 'Open Sans' },
  meta: { format: 'A6' },
});
const setStyle = (id, patch) => (d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, style: { ...e.style, ...patch } } : e)) });
const color = (s) => s.present.elements[0].style.couleur;

test('color change → undo → redo', () => {
  let s = createHistory(doc(), ['a']);
  s = reduce(s, { type: 'commit', label: 'couleur du texte', apply: setStyle('a', { couleur: '#FF0000' }) });
  assert.equal(color(s), '#FF0000');
  assert.equal(undoLabel(s), 'couleur du texte');
  s = reduce(s, { type: 'undo' });
  assert.equal(color(s), '#000000');
  assert.equal(redoLabel(s), 'couleur du texte');
  s = reduce(s, { type: 'redo' });
  assert.equal(color(s), '#FF0000');
});

test('theme change is undoable like any element change', () => {
  let s = createHistory(doc());
  s = reduce(s, { type: 'commit', label: 'couleur principale', apply: (d) => ({ ...d, theme: { ...d.theme, couleurPrincipale: '#00AA00' } }) });
  s = reduce(s, { type: 'commit', label: 'format', apply: (d) => ({ ...d, meta: { ...d.meta, format: 'CARTE' } }) });
  s = reduce(s, { type: 'undo' });
  assert.equal(s.present.meta.format, 'A6');
  s = reduce(s, { type: 'undo' });
  assert.equal(s.present.theme.couleurPrincipale, '#111111');
});

test('coalesced picker drag: 10 onChange events → 1 step, whatever the delay between them', () => {
  let s = createHistory(doc());
  for (let i = 0; i < 10; i += 1) {
    s = reduce(s, { type: 'commit', label: 'couleur du texte', coalesceKey: 'a:style:couleur', apply: setStyle('a', { couleur: `#00000${i}` }) });
  }
  assert.equal(s.past.length, 1);
  assert.equal(color(s), '#000009');
  s = reduce(s, { type: 'endGesture' });
  s = reduce(s, { type: 'undo' });
  assert.equal(color(s), '#000000');
  assert.equal(s.past.length, 0);
});

test('a closed gesture, another key or a keyless change start a new step', () => {
  let s = createHistory(doc());
  const c = (v, key) => ({ type: 'commit', label: 'x', coalesceKey: key, apply: setStyle('a', { couleur: v }) });
  s = reduce(s, c('#000001', 'k'));
  s = reduce(s, { type: 'endGesture', key: 'k' });
  s = reduce(s, c('#000002', 'k'));
  assert.equal(s.past.length, 2);
  s = reduce(s, c('#000003', 'other'));
  assert.equal(s.past.length, 3);
  s = reduce(s, { type: 'commit', label: 'move', apply: (d) => ({ ...d, elements: d.elements.map((e) => ({ ...e, x: e.x + 1 })) }) });
  s = reduce(s, c('#000004', 'other'));
  assert.equal(s.past.length, 5);
  // endGesture for another key leaves the open one alone
  s = reduce(s, { type: 'endGesture', key: 'nope' });
  s = reduce(s, c('#000005', 'other'));
  assert.equal(s.past.length, 5);
});

test('undo after redo: a new change discards the redo branch', () => {
  let s = createHistory(doc());
  s = reduce(s, { type: 'commit', label: '1', apply: setStyle('a', { couleur: '#000001' }) });
  s = reduce(s, { type: 'commit', label: '2', apply: setStyle('a', { couleur: '#000002' }) });
  s = reduce(s, { type: 'undo' });
  s = reduce(s, { type: 'undo' });
  s = reduce(s, { type: 'redo' });
  assert.equal(color(s), '#000001');
  s = reduce(s, { type: 'commit', label: '3', apply: setStyle('a', { couleur: '#000003' }) });
  assert.equal(s.future.length, 0);
  assert.equal(reduce(s, { type: 'redo' }), s);
  s = reduce(s, { type: 'undo' });
  assert.equal(color(s), '#000001');
  s = reduce(s, { type: 'undo' });
  assert.equal(color(s), '#000000');
});

test('snapshots are immutable: mutating the current document never alters history', () => {
  let s = createHistory(doc());
  const shared = { couleur: '#ABCDEF' };
  s = reduce(s, { type: 'commit', label: 'c', apply: (d) => ({ ...d, elements: d.elements.map((e) => (e.id === 'a' ? { ...e, style: shared } : e)) }) });
  shared.couleur = '#BADBAD'; // the caller keeps mutating its object
  assert.equal(color(s), '#ABCDEF');
  s.present.elements[0].style.couleur = '#123456'; // a buggy in-place edit of the present
  s = reduce(s, { type: 'undo' });
  assert.equal(color(s), '#000000');
  assert.notEqual(s.past.length ? s.past[0].doc.elements[0].style : null, shared);
});

test('undo / redo restore the selection of that step; no-op changes record nothing', () => {
  let s = createHistory(doc(), ['a']);
  s = reduce(s, { type: 'commit', label: 'suppression', apply: (d) => ({ ...d, elements: d.elements.filter((e) => e.id !== 'a') }), selection: [] });
  assert.deepEqual(s.selection, []);
  s = reduce(s, { type: 'select', selection: ['b'] });
  s = reduce(s, { type: 'undo' });
  assert.deepEqual(s.selection, ['a']);
  assert.equal(s.present.elements.length, 2);
  s = reduce(s, { type: 'redo' });
  assert.deepEqual(s.selection, ['b']);
  const before = s;
  s = reduce(s, { type: 'commit', label: 'rien', apply: (d) => ({ ...d, elements: d.elements.map((e) => ({ ...e })) }) });
  assert.equal(s, before);
});

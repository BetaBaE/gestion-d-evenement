import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eligibility, summarize } from './bulkRules.js';

const p = (statut, extra = {}) => ({ _id: `id-${Math.random()}`, statut, email: 'a@b.ma', nbImpressionsBadge: 0, categorieId: 'cat1', ...extra });

test('valider (et envoyer): only pending participants; validated / refused skipped', () => {
  assert.deepEqual(eligibility('VALIDER_ENVOYER', p('EN_ATTENTE')), { ok: true });
  assert.deepEqual(eligibility('VALIDER_ENVOYER', p('VALIDE')), { ok: false, raison: 'déjà validés' });
  assert.deepEqual(eligibility('VALIDER', p('REFUSE')), { ok: false, raison: 'refusés' });
  assert.deepEqual(eligibility('VALIDER_ENVOYER', p('EN_ATTENTE', { email: '' })), { ok: false, raison: 'sans email' });
});

test('refuser: everyone not already refused', () => {
  assert.equal(eligibility('REFUSER', p('VALIDE')).ok, true);
  assert.deepEqual(eligibility('REFUSER', p('REFUSE')), { ok: false, raison: 'déjà refusés' });
});

test('changer la catégorie: skipped when already in it', () => {
  assert.equal(eligibility('CHANGER_CATEGORIE', p('VALIDE'), { options: { categorieId: 'cat2' } }).ok, true);
  assert.equal(eligibility('CHANGER_CATEGORIE', p('VALIDE'), { options: { categorieId: 'cat1' } }).raison, 'déjà dans cette catégorie');
});

test('renvoyer email: badge only for validated participants', () => {
  assert.equal(eligibility('RENVOYER_EMAIL', p('EN_ATTENTE'), { options: { type: 'CONFIRMATION' } }).ok, true);
  assert.equal(eligibility('RENVOYER_EMAIL', p('EN_ATTENTE'), { options: { type: 'BADGE' } }).raison, 'non validés (pas de badge)');
  assert.equal(eligibility('RENVOYER_EMAIL', p('VALIDE'), { options: { type: 'BADGE' } }).ok, true);
});

test('imprimer: non validated skipped unless included; "jamais imprimés" option', () => {
  assert.equal(eligibility('IMPRIMER', p('EN_ATTENTE')).raison, 'non validés');
  assert.equal(eligibility('IMPRIMER', p('EN_ATTENTE'), { options: { inclureNonValides: true } }).ok, true);
  assert.equal(eligibility('IMPRIMER', p('VALIDE', { nbImpressionsBadge: 2 }), { options: { seulementJamaisImprimes: true } }).raison, 'déjà imprimés');
});

test('supprimer: participants already scanned are kept', () => {
  const scanned = p('VALIDE');
  assert.equal(eligibility('SUPPRIMER', scanned, { scannes: new Set([String(scanned._id)]) }).ok, false);
  assert.equal(eligibility('SUPPRIMER', p('VALIDE'), { scannes: new Set() }).ok, true);
});

test('summary: "37 sélectionnés → 34 seront validés · 3 déjà validés"', () => {
  const list = [...Array.from({ length: 34 }, () => p('EN_ATTENTE')), ...Array.from({ length: 3 }, () => p('VALIDE'))];
  const s = summarize('VALIDER_ENVOYER', list);
  assert.equal(s.total, 37);
  assert.equal(s.eligibles, 34);
  assert.deepEqual(s.ignores, [{ raison: 'déjà validés', n: 3 }]);
  assert.equal(s.emails, 34);
});

test('summary for printing counts badges already printed (reprint warning)', () => {
  const s = summarize('IMPRIMER', [p('VALIDE', { nbImpressionsBadge: 1 }), p('VALIDE'), p('EN_ATTENTE')]);
  assert.equal(s.eligibles, 2);
  assert.equal(s.dejaImprimes, 1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTextVariables } from './textVariables.js';

const ctx = {
  participant: { nom: 'Dupont', prenom: 'Jean', fonction: 'Directeur' },
  organisme: { nom: 'ATNER' },
  categorie: { nom: 'Exposant' },
  event: { titre: 'Salon 2026', dateDebut: '2026-09-14T08:00:00Z', dateFin: '2026-09-17T18:00:00Z', lieu: 'Casablanca' },
  organisateur: { nom: 'AMEPA', siteWeb: 'www.amepa.ma' },
};

test('resolves participant and event variables', () => {
  assert.equal(
    resolveTextVariables('{{participant.nomPrenom}} — {{participant.organisme}} — {{event.titre}}', ctx),
    'Jean DUPONT — ATNER — Salon 2026',
  );
});

test('counts event days inclusively', () => {
  assert.equal(resolveTextVariables('{{event.nbJours}} jours', ctx), '4 jours');
});

test('single-day event reports 1 day and a single date', () => {
  const oneDay = { ...ctx, event: { ...ctx.event, dateFin: '2026-09-14T18:00:00Z' } };
  assert.equal(resolveTextVariables('{{event.nbJours}}', oneDay), '1');
  assert.ok(!resolveTextVariables('{{event.dates}}', oneDay).includes(' - '));
});

test('unknown variables and rich-text markers are left untouched', () => {
  assert.equal(resolveTextVariables('{{participant.motDePasse}} {{b}}x{{/b}}', ctx), '{{participant.motDePasse}} {{b}}x{{/b}}');
});

test('missing data resolves to empty strings, not "undefined"', () => {
  assert.equal(resolveTextVariables('[{{participant.fonction}}][{{organisateur.siteWeb}}]', { event: {} }), '[][]');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VARIABLES,
  VARIABLE_GROUPS,
  VARIABLE_ALIASES,
  resolveVariable,
  resolveTextVariables,
  unknownVariables,
  listVariablesByGroup,
  formatDateRangeLong,
  formatDateRangeCourt,
} from './variables.js';
import { checkBadgeRules } from './rules.js';

const TZ = 'Africa/Casablanca';
const full = {
  timezone: TZ,
  numero: 42,
  dateImpression: '2026-11-05T10:00:00Z',
  participant: {
    civilite: 'Mme', nom: 'El Idrissi', prenom: 'amina', fonction: 'Directrice', email: 'a@x.ma', telephone: '0600',
    createdAt: '2026-11-03T09:00:00Z', badgeCode: 'SECRET-CODE',
  },
  organisme: {
    nom: 'ONEE', siegeSocial: 'Rabat', adresse: '6 av', ville: 'Rabat', pays: 'Maroc', telephone: '0537', fax: '0538',
    email: 'o@x.ma', siteWeb: 'onee.ma', contactNom: 'Karim', contactFonction: 'RH',
  },
  categorie: { nom: 'VIP', description: 'Toutes zones' },
  event: {
    titre: 'Salon', description: 'Desc', lieu: 'Palais', adresse: '45 av', ville: 'Rabat',
    dateDebut: '2026-11-18T08:00:00Z', dateFin: '2026-11-20T17:00:00Z', dateLimiteInscription: '2026-11-10T23:00:00Z',
  },
  organisateur: { nom: 'AMEPA', sigle: 'AM', adresse: '12 rue', ville: 'Casa', pays: 'Maroc', telephone: '0522', fax: '0523', email: 'c@x.ma', siteWeb: 'amepa.ma' },
};

test('every registry key resolves to a non-empty string on a complete context', () => {
  for (const v of VARIABLES) {
    const value = resolveVariable(v.key, full);
    assert.equal(typeof value, 'string', v.key);
    assert.ok(value.length > 0, `${v.key} is empty`);
    assert.ok(!/undefined|null|\{\{/.test(value), `${v.key} → ${value}`);
  }
});

test('every variable has a group from the menu order, a label and an example', () => {
  const groups = VARIABLE_GROUPS.map((g) => g.key);
  for (const v of VARIABLES) {
    assert.ok(groups.includes(v.groupe), v.key);
    assert.ok(v.libelle && v.exemple, v.key);
  }
  assert.deepEqual(listVariablesByGroup().map((g) => g.libelle), ['Participant', 'Organisme invité', 'Catégorie', 'Événement', 'Organisateur', 'Badge']);
});

test('the badge code, tokens and ids are never exposed', () => {
  const keys = VARIABLES.map((v) => v.key.toLowerCase());
  assert.ok(!keys.some((k) => /badgecode|token|id$|\._?id/.test(k)), keys.join(','));
  const all = VARIABLES.map((v) => resolveVariable(v.key, full)).join('|');
  assert.ok(!all.includes('SECRET-CODE'));
});

test('formats: names, dates in the time zone, times, number of days', () => {
  assert.equal(resolveVariable('participant.nomPrenom', full), 'amina EL IDRISSI');
  assert.equal(resolveVariable('participant.prenomNom', full), 'Amina El Idrissi');
  assert.equal(resolveVariable('participant.initiales', full), 'AE');
  assert.equal(resolveVariable('event.dates', full), '18 – 20 novembre 2026');
  assert.equal(resolveVariable('event.datesCourt', full), '18–20/11/2026');
  assert.equal(resolveVariable('event.heureDebut', full), '09:00'); // 08:00 UTC = 09:00 in Casablanca (UTC+1)
  assert.equal(resolveVariable('event.nbJours', full), '3');
  // 23:00 UTC on the 10th is already the 11th in Casablanca.
  assert.equal(resolveVariable('event.dateLimiteInscription', full), '11 novembre 2026');
  assert.equal(resolveVariable('participant.numero', full), '42');
});

test('date ranges across months, years and a single day', () => {
  assert.equal(formatDateRangeLong('2026-11-28T10:00:00Z', '2026-12-02T10:00:00Z', TZ), '28 novembre – 2 décembre 2026');
  assert.equal(formatDateRangeLong('2026-12-30T10:00:00Z', '2027-01-02T10:00:00Z', TZ), '30 décembre 2026 – 2 janvier 2027');
  assert.equal(formatDateRangeLong('2026-11-18T08:00:00Z', '2026-11-18T17:00:00Z', TZ), '18 novembre 2026');
  assert.equal(formatDateRangeCourt('2026-11-28T10:00:00Z', '2026-12-02T10:00:00Z', TZ), '28/11–02/12/2026');
  assert.equal(formatDateRangeCourt('2026-11-18T08:00:00Z', '2026-11-18T17:00:00Z', TZ), '18/11/2026');
});

test('aliases resolve (old templates keep working) and are hidden from the menu', () => {
  assert.equal(resolveTextVariables('{{participant.categorie}} / {{participant.organisme}}', full), 'VIP / ONEE');
  const menuKeys = listVariablesByGroup().flatMap((g) => g.variables.map((v) => v.key));
  Object.keys(VARIABLE_ALIASES).forEach((alias) => assert.ok(!menuKeys.includes(alias)));
});

test('empty values: no undefined/null/{{…}}, separators around them are cleaned', () => {
  const noAddress = { ...full, event: { ...full.event, adresse: '' } };
  assert.equal(resolveTextVariables('{{event.adresse}}, {{event.ville}}', noAddress), 'Rabat');
  const noCity = { ...full, event: { ...full.event, ville: undefined } };
  assert.equal(resolveTextVariables('{{event.adresse}}, {{event.ville}}', noCity), '45 av');
  assert.equal(resolveTextVariables('{{event.titre}} · {{event.lieu}} · {{event.ville}}', { ...full, event: { titre: 'Salon', ville: 'Rabat' } }), 'Salon · Rabat');
  assert.equal(resolveTextVariables('[{{participant.fonction}}][{{organisateur.siteWeb}}]', { event: {} }), '[][]');
  assert.equal(resolveTextVariables('{{organisme.fax}}', {}), '');
  // Literal-only texts and filled variables are untouched.
  assert.equal(resolveTextVariables(' — ', full), ' — ');
  assert.equal(resolveTextVariables('{{event.adresse}}, {{event.ville}}', full), '45 av, Rabat');
});

test('rich-text markers pass through; unknown variables render empty and are detected', () => {
  assert.equal(resolveTextVariables('{{b}}{{categorie.nom}}{{/b}}', full), '{{b}}VIP{{/b}}');
  assert.equal(resolveTextVariables('x{{event.inconnu}}', full), 'x');
  assert.deepEqual(unknownVariables('{{event.inconnu}} {{event.titre}} {{participant.organisme}} {{b}}'), ['event.inconnu']);
});

test('rules engine: an unknown variable blocks, naming the element', () => {
  const badge = {
    format: 'A6',
    elements: [
      { id: 'n', type: 'champ', panneau: 'P1', props: { champ: 'nomPrenom' } },
      { id: 'q', type: 'qrCode', panneau: 'P1', props: {} },
      { id: 't', type: 'texte', panneau: 'P1', props: { contenu: 'Le {{event.inconnu}}' } },
    ],
  };
  const rule = checkBadgeRules(badge).find((r) => r.code === 'VARIABLE_INCONNUE');
  assert.equal(rule?.niveau, 'bloquant');
  assert.equal(rule.elementId, 't');
  assert.match(rule.message, /\{\{event\.inconnu\}\}/);
  badge.elements[2].props.contenu = '{{event.titre}} {{participant.categorie}}';
  assert.ok(!checkBadgeRules(badge).some((r) => r.code === 'VARIABLE_INCONNUE'));
});

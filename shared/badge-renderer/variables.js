/**
 * Text variables ({{groupe.champ}}) — the single source of truth for the
 * editor's "Insérer une variable" menu, the renderer, the rules engine and
 * the template import check.
 *
 * Each entry: { key, groupe, libelle, exemple, resolve(ctx) }. Dates and
 * times are formatted in French in ctx.timezone (APP_TIMEZONE on the server,
 * the same default in the editor). Missing data resolves to ''.
 *
 * Never exposed: badgeCode, tokens, ids (the QR is the only place the badge
 * code appears).
 */

export const DEFAULT_TIMEZONE = 'Africa/Casablanca';

export const VARIABLE_GROUPS = [
  { key: 'participant', libelle: 'Participant' },
  { key: 'organisme', libelle: 'Organisme invité' },
  { key: 'categorie', libelle: 'Catégorie' },
  { key: 'event', libelle: 'Événement' },
  { key: 'organisateur', libelle: 'Organisateur' },
  { key: 'badge', libelle: 'Badge' },
];

const str = (v) => (v === undefined || v === null ? '' : String(v));
const tz = (ctx) => ctx?.timezone || DEFAULT_TIMEZONE;

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** { day, month, year } of a date in the time zone (numbers). */
function partsInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { day: get('day'), month: get('month'), year: get('year') };
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const pad = (n) => String(n).padStart(2, '0');

/** "18 novembre 2026" */
export function formatDateLong(value, timeZone = DEFAULT_TIMEZONE) {
  const d = toDate(value);
  if (!d) return '';
  const { day, month, year } = partsInZone(d, timeZone);
  return `${day} ${MOIS[month - 1]} ${year}`;
}

/** "09:00" */
export function formatTime(value, timeZone = DEFAULT_TIMEZONE) {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat('fr-FR', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/** "18 – 20 novembre 2026", "28 novembre – 2 décembre 2026", one day: "18 novembre 2026" */
export function formatDateRangeLong(debut, fin, timeZone = DEFAULT_TIMEZONE) {
  const d1 = toDate(debut);
  const d2 = toDate(fin) || d1;
  if (!d1) return '';
  const a = partsInZone(d1, timeZone);
  const b = partsInZone(d2, timeZone);
  if (a.day === b.day && a.month === b.month && a.year === b.year) return formatDateLong(d1, timeZone);
  if (a.year !== b.year) return `${formatDateLong(d1, timeZone)} – ${formatDateLong(d2, timeZone)}`;
  if (a.month !== b.month) return `${a.day} ${MOIS[a.month - 1]} – ${b.day} ${MOIS[b.month - 1]} ${b.year}`;
  return `${a.day} – ${b.day} ${MOIS[b.month - 1]} ${b.year}`;
}

const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** "18 – 20 nov.", "28 nov. – 2 déc.", one day: "18 nov." (no year: the "Dates" element, short format) */
export function formatDateRangeMoisCourt(debut, fin, timeZone = DEFAULT_TIMEZONE) {
  const d1 = toDate(debut);
  const d2 = toDate(fin) || d1;
  if (!d1) return '';
  const a = partsInZone(d1, timeZone);
  const b = partsInZone(d2, timeZone);
  if (a.day === b.day && a.month === b.month && a.year === b.year) return `${a.day} ${MOIS_COURT[a.month - 1]}`;
  if (a.month === b.month && a.year === b.year) return `${a.day} – ${b.day} ${MOIS_COURT[b.month - 1]}`;
  return `${a.day} ${MOIS_COURT[a.month - 1]} – ${b.day} ${MOIS_COURT[b.month - 1]}`;
}

/** "18–20/11/2026", "28/11–02/12/2026", one day: "18/11/2026" */
export function formatDateRangeCourt(debut, fin, timeZone = DEFAULT_TIMEZONE) {
  const d1 = toDate(debut);
  const d2 = toDate(fin) || d1;
  if (!d1) return '';
  const a = partsInZone(d1, timeZone);
  const b = partsInZone(d2, timeZone);
  const full = (p) => `${pad(p.day)}/${pad(p.month)}/${p.year}`;
  if (a.day === b.day && a.month === b.month && a.year === b.year) return full(a);
  if (a.year !== b.year) return `${full(a)}–${full(b)}`;
  if (a.month !== b.month) return `${pad(a.day)}/${pad(a.month)}–${full(b)}`;
  return `${pad(a.day)}–${full(b)}`;
}

/** Days covered, inclusive, counted on calendar dates in the time zone. */
export function countDays(debut, fin, timeZone = DEFAULT_TIMEZONE) {
  const d1 = toDate(debut);
  const d2 = toDate(fin);
  if (!d1 || !d2) return '';
  const a = partsInZone(d1, timeZone);
  const b = partsInZone(d2, timeZone);
  const days = Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000) + 1;
  return String(days);
}

const nomMaj = (p) => str(p?.nom).toUpperCase();
const capitalize = (s) => str(s).toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());

const V = (key, libelle, exemple, resolve) => ({ key, groupe: key.split('.')[0], libelle, exemple, resolve });

export const VARIABLES = [
  // Participant
  V('participant.civilite', 'Civilité', 'Mme', (c) => str(c.participant?.civilite)),
  V('participant.nom', 'Nom', 'El Idrissi', (c) => str(c.participant?.nom)),
  V('participant.prenom', 'Prénom', 'Amina', (c) => str(c.participant?.prenom)),
  V('participant.nomPrenom', 'Nom complet (Prénom NOM)', 'Amina EL IDRISSI', (c) => `${str(c.participant?.prenom)} ${nomMaj(c.participant)}`.trim()),
  V('participant.prenomNom', 'Prénom Nom', 'Amina El Idrissi', (c) => `${capitalize(c.participant?.prenom)} ${capitalize(c.participant?.nom)}`.trim()),
  V('participant.initiales', 'Initiales', 'AE', (c) => `${str(c.participant?.prenom).trim().charAt(0)}${str(c.participant?.nom).trim().charAt(0)}`.toUpperCase()),
  V('participant.fonction', 'Fonction', 'Directrice des opérations', (c) => str(c.participant?.fonction)),
  V('participant.email', 'Email', 'amina@exemple.ma', (c) => str(c.participant?.email)),
  V('participant.telephone', 'Téléphone', '+212 600 000 000', (c) => str(c.participant?.telephone)),
  V("participant.dateInscription", "Date d'inscription", '3 novembre 2026', (c) => formatDateLong(c.participant?.createdAt, tz(c))),
  V('participant.numero', 'Numéro du participant', '42', (c) => str(c.numero ?? c.participant?.numero)),

  // Organisme invité
  V('organisme.nom', 'Nom', "Office National de l'Eau", (c) => str(c.organisme?.nom)),
  V('organisme.siegeSocial', 'Siège social', 'Rabat', (c) => str(c.organisme?.siegeSocial)),
  V('organisme.adresse', 'Adresse', '6 avenue Hassan II', (c) => str(c.organisme?.adresse)),
  V('organisme.ville', 'Ville', 'Rabat', (c) => str(c.organisme?.ville)),
  V('organisme.pays', 'Pays', 'Maroc', (c) => str(c.organisme?.pays)),
  V('organisme.telephone', 'Téléphone', '+212 537 000 000', (c) => str(c.organisme?.telephone)),
  V('organisme.fax', 'Fax', '+212 537 000 001', (c) => str(c.organisme?.fax)),
  V('organisme.email', 'Email', 'contact@organisme.ma', (c) => str(c.organisme?.email)),
  V('organisme.siteWeb', 'Site web', 'www.organisme.ma', (c) => str(c.organisme?.siteWeb)),
  V('organisme.contactNom', 'Nom du contact', 'Karim Bennani', (c) => str(c.organisme?.contactNom)),
  V('organisme.contactFonction', 'Fonction du contact', 'Responsable RH', (c) => str(c.organisme?.contactFonction)),

  // Catégorie
  V('categorie.nom', 'Nom', 'VIP', (c) => str(c.categorie?.nom)),
  V('categorie.description', 'Description', 'Accès à toutes les zones', (c) => str(c.categorie?.description)),

  // Événement
  V('event.titre', 'Titre', 'Salon 2026', (c) => str(c.event?.titre)),
  V('event.description', 'Description', 'Le rendez-vous annuel du secteur', (c) => str(c.event?.description)),
  V('event.lieu', 'Lieu', 'Palais des Congrès', (c) => str(c.event?.lieu)),
  V('event.adresse', 'Adresse', '45 avenue Hassan II', (c) => str(c.event?.adresse)),
  V('event.ville', 'Ville', 'Rabat', (c) => str(c.event?.ville)),
  V('event.dateDebut', 'Date de début', '18 novembre 2026', (c) => formatDateLong(c.event?.dateDebut, tz(c))),
  V('event.dateFin', 'Date de fin', '20 novembre 2026', (c) => formatDateLong(c.event?.dateFin, tz(c))),
  V('event.dates', 'Dates', '18 – 20 novembre 2026', (c) => formatDateRangeLong(c.event?.dateDebut, c.event?.dateFin, tz(c))),
  V('event.datesCourt', 'Dates (court)', '18–20/11/2026', (c) => formatDateRangeCourt(c.event?.dateDebut, c.event?.dateFin, tz(c))),
  V('event.heureDebut', 'Heure de début', '09:00', (c) => formatTime(c.event?.dateDebut, tz(c))),
  V('event.heureFin', 'Heure de fin', '18:00', (c) => formatTime(c.event?.dateFin, tz(c))),
  V('event.nbJours', 'Nombre de jours', '3', (c) => countDays(c.event?.dateDebut, c.event?.dateFin, tz(c))),
  V('event.dateLimiteInscription', "Date limite d'inscription", '10 novembre 2026', (c) => formatDateLong(c.event?.dateLimiteInscription, tz(c))),

  // Organisateur
  V('organisateur.nom', 'Nom', 'Association des Métiers', (c) => str(c.organisateur?.nom)),
  V('organisateur.sigle', 'Sigle', 'AMEPA', (c) => str(c.organisateur?.sigle)),
  V('organisateur.adresse', 'Adresse', '12 rue de Fès', (c) => str(c.organisateur?.adresse)),
  V('organisateur.ville', 'Ville', 'Casablanca', (c) => str(c.organisateur?.ville)),
  V('organisateur.pays', 'Pays', 'Maroc', (c) => str(c.organisateur?.pays)),
  V('organisateur.telephone', 'Téléphone', '+212 522 000 000', (c) => str(c.organisateur?.telephone)),
  V('organisateur.fax', 'Fax', '+212 522 000 001', (c) => str(c.organisateur?.fax)),
  V('organisateur.email', 'Email', 'contact@organisateur.ma', (c) => str(c.organisateur?.email)),
  V('organisateur.siteWeb', 'Site web', 'www.organisateur.ma', (c) => str(c.organisateur?.siteWeb)),

  // Badge
  V('badge.dateImpression', "Date d'impression", '5 novembre 2026', (c) => formatDateLong(c.dateImpression || new Date(), tz(c))),
];

/** Old keys kept so existing templates keep rendering; not shown in the menu. */
export const VARIABLE_ALIASES = {
  'participant.organisme': 'organisme.nom',
  'participant.categorie': 'categorie.nom',
};

const BY_KEY = new Map(VARIABLES.map((v) => [v.key, v]));

export function getVariable(key) {
  return BY_KEY.get(VARIABLE_ALIASES[key] || key) || null;
}

export function isKnownVariable(key) {
  return !!getVariable(key);
}

export function resolveVariable(key, ctx) {
  const v = getVariable(key);
  return v ? v.resolve(ctx || {}) : '';
}

// {{groupe.champ}} — rich-text markers ({{b}}…{{/b}}) have no dot and never match.
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g;

/** Every variable key used in a text, in order (duplicates kept). */
export function extractVariables(source) {
  return [...String(source || '').matchAll(VARIABLE_PATTERN)].map((m) => m[1]);
}

export function unknownVariables(source) {
  return [...new Set(extractVariables(source).filter((k) => !isKnownVariable(k)))];
}

// Literal text made only of spaces and separators (", ", " · ", " – ", " | ", "/"…).
const SEPARATOR = /^[\s,;:·•|/–—-]*$/;

/**
 * Replaces variables by their values. Unknown keys render as '' (the rules
 * engine blocks them before publishing). When a variable is empty, the
 * separators around it go too: "{{event.adresse}}, {{event.ville}}" with no
 * address gives "Rabat", not ", Rabat".
 */
export function resolveTextVariables(source, ctx) {
  if (!source) return '';
  const text = String(source);
  const segments = [];
  let last = 0;
  let anyEmpty = false;
  for (const m of text.matchAll(VARIABLE_PATTERN)) {
    if (m.index > last) segments.push({ literal: true, value: text.slice(last, m.index) });
    const value = resolveVariable(m[1], ctx);
    if (!value) anyEmpty = true;
    segments.push({ literal: false, value });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ literal: true, value: text.slice(last) });
  if (!anyEmpty) return segments.map((s) => s.value).join('');

  // Separators are kept only between two non-empty pieces.
  let out = '';
  let pendingSep = null;
  let hasContent = false;
  for (const s of segments) {
    if (s.literal && SEPARATOR.test(s.value)) {
      if (hasContent && pendingSep === null) pendingSep = s.value;
      continue;
    }
    if (!s.value) continue;
    if (pendingSep !== null && hasContent) out += pendingSep;
    pendingSep = null;
    out += s.value;
    hasContent = true;
  }
  return out;
}

/** Menu entries (aliases excluded), grouped in menu order. */
export function listVariablesByGroup() {
  return VARIABLE_GROUPS.map((g) => ({ ...g, variables: VARIABLES.filter((v) => v.groupe === g.key) }));
}

export function listTextVariables() {
  return VARIABLES.map((v) => v.key);
}

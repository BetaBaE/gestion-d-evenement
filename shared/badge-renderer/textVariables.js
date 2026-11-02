function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateRange(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) return '';
  const d1 = formatDate(dateDebut);
  const d2 = formatDate(dateFin);
  return d1 === d2 ? d1 : `${d1} - ${d2}`;
}

function nbJours(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) return '';
  const ms = new Date(dateFin).setHours(0, 0, 0, 0) - new Date(dateDebut).setHours(0, 0, 0, 0);
  return String(Math.round(ms / 86400000) + 1);
}

function formatNomPrenom(participant) {
  const nom = (participant?.nom || '').toUpperCase();
  const prenom = participant?.prenom || '';
  return `${prenom} ${nom}`.trim();
}

/**
 * Resolves {{namespace.field}} variables (Addendum 3 v2 §3) against the
 * render context. Variables are inserted from a menu in the editor, never
 * typed by hand, but this still only recognizes an explicit allow-list —
 * any other {{...}} (rich-text markup, or unrecognized text) passes
 * through untouched for renderRichText to handle afterwards.
 */
const VARIABLE_RESOLVERS = {
  'participant.nomPrenom': (ctx) => formatNomPrenom(ctx.participant),
  'participant.fonction': (ctx) => ctx.participant?.fonction || '',
  'participant.organisme': (ctx) => ctx.organisme?.nom || '',
  'participant.categorie': (ctx) => ctx.categorie?.nom || '',
  'event.titre': (ctx) => ctx.event?.titre || '',
  'event.dateDebut': (ctx) => formatDate(ctx.event?.dateDebut),
  'event.dateFin': (ctx) => formatDate(ctx.event?.dateFin),
  'event.dates': (ctx) => formatDateRange(ctx.event?.dateDebut, ctx.event?.dateFin),
  'event.nbJours': (ctx) => nbJours(ctx.event?.dateDebut, ctx.event?.dateFin),
  'event.lieu': (ctx) => ctx.event?.lieu || '',
  'organisateur.nom': (ctx) => ctx.organisateur?.nom || '',
  'organisateur.siteWeb': (ctx) => ctx.organisateur?.siteWeb || '',
};

export function resolveTextVariables(source, ctx) {
  if (!source) return '';
  return source.replace(/\{\{([a-zA-Z]+\.[a-zA-Z]+)\}\}/g, (match, key) => {
    const resolver = VARIABLE_RESOLVERS[key];
    return resolver ? resolver(ctx) : match;
  });
}

export function listTextVariables() {
  return Object.keys(VARIABLE_RESOLVERS);
}

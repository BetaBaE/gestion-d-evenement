/**
 * Bulk badge printing — pure planning (unit tested): print order, where
 * separator pages go, how cards are imposed on an A4 sheet and how the
 * output is split into downloadable parts.
 */

export const ORDRES = {
  ORGANISME_NOM: 'Organisme, puis nom',
  NOM: 'Nom',
  CATEGORIE_NOM: 'Catégorie, puis nom',
  INSCRIPTION: "Ordre d'inscription",
};

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byName = (a, b) => collator.compare(a.nom || '', b.nom || '') || collator.compare(a.prenom || '', b.prenom || '');

/**
 * Participants in print order. names: { organisme: Map(id → nom), categorie: Map(id → nom) }.
 */
export function sortForPrint(participants, ordre = 'ORGANISME_NOM', names = {}) {
  const org = (p) => names.organisme?.get(String(p.invitedOrganismId)) || '';
  const cat = (p) => names.categorie?.get(String(p.categorieId)) || '';
  const compare = {
    ORGANISME_NOM: (a, b) => collator.compare(org(a), org(b)) || String(a.invitedOrganismId).localeCompare(String(b.invitedOrganismId)) || byName(a, b),
    NOM: byName,
    CATEGORIE_NOM: (a, b) => collator.compare(cat(a), cat(b)) || byName(a, b),
    INSCRIPTION: (a, b) => new Date(a.createdAt) - new Date(b.createdAt) || String(a._id).localeCompare(String(b._id)),
  }[ordre] || byName;
  return [...participants].sort(compare);
}

/**
 * Groups of consecutive badges sharing an organisme, for separator pages:
 * [{ start, count, key }] over the printed sequence of organisme keys.
 */
export function separatorGroups(keys) {
  const groups = [];
  keys.forEach((key, i) => {
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.count += 1;
    else groups.push({ start: i, count: 1, key });
  });
  return groups;
}

/**
 * Cards on an A4 sheet (mm): as many columns / rows as fit inside the
 * margins (which hold the cut marks), the grid centred on the sheet.
 */
export function impositionGrid({ cardW, cardH, sheetW = 210, sheetH = 297, margin = 10 }) {
  const cols = Math.floor((sheetW - 2 * margin) / cardW);
  const rows = Math.floor((sheetH - 2 * margin) / cardH);
  if (cols < 1 || rows < 1) return null;
  return {
    cols,
    rows,
    perSheet: cols * rows,
    offsetX: (sheetW - cols * cardW) / 2,
    offsetY: (sheetH - rows * cardH) / 2,
  };
}

/**
 * Splits rendered chunks into output files of at most `limit` bytes
 * (estimated as the sum of the chunk sizes). A single chunk larger than the
 * limit still gets its own part. Returns arrays of chunk indexes.
 */
export function planParts(chunkSizes, limit = Infinity) {
  const parts = [];
  let current = [];
  let size = 0;
  chunkSizes.forEach((s, i) => {
    if (current.length && size + s > limit) {
      parts.push(current);
      current = [];
      size = 0;
    }
    current.push(i);
    size += s;
  });
  if (current.length) parts.push(current);
  return parts;
}

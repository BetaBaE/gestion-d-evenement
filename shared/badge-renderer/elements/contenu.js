import { registerElement } from '../registry.js';
import { esc } from '../escape.js';
import { ok, fail } from '../validate.js';
import { dynamicTextMarkup } from './texte.js';
import { ICONS } from '../icons.js';

registerElement('forme', {
  defaultProps: { forme: 'rectangle' },
  defaultSizeMm: { largeur: 40, hauteur: 10 },
  validateProps(props) {
    const forme = props?.forme;
    if (!forme || !['rectangle', 'pilule', 'cercle', 'ligne'].includes(forme)) {
      return fail('forme invalide');
    }
    return ok({ forme });
  },
  render() {
    return '';
  },
});

registerElement('bandeCategorie', {
  defaultProps: { texte: 'auto' },
  defaultSizeMm: { largeur: 95, hauteur: 10 },
  validateProps(props) {
    const texte = props?.texte;
    if (texte && texte !== 'auto' && typeof texte !== 'string') {
      return fail('texte invalide pour la bande de catégorie');
    }
    return ok({ texte: texte || 'auto' });
  },
  render({ props, ctx }) {
    const label = props.texte === 'auto' || !props.texte ? ctx.categorie?.nom || '' : props.texte;
    if (!label) return '';
    return dynamicTextMarkup(label);
  },
});

registerElement('icone', {
  defaultProps: { icone: 'info' },
  defaultSizeMm: { largeur: 8, hauteur: 8 },
  validateProps(props) {
    const icone = props?.icone;
    if (!icone || !Object.hasOwn(ICONS, icone)) {
      return fail('icône inconnue');
    }
    return ok({ icone });
  },
  render({ props }) {
    // Vector icon filling the box, drawn in currentColor: it takes the
    // element's color (style.couleur → theme token or hex). The markup comes
    // from the static ICONS table, never from user input.
    return `<svg class="el-icone" viewBox="0 0 24 24" fill="currentColor" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${ICONS[props.icone].svg}</svg>`;
  },
});

function chunk(array, size) {
  const rows = [];
  for (let i = 0; i < array.length; i += size) rows.push(array.slice(i, i + size));
  return rows;
}

registerElement('grillePartenaires', {
  defaultProps: { partenaires: [], colonnes: 3, espacementMm: 2 },
  defaultSizeMm: { largeur: 90, hauteur: 30 },
  validateProps(props) {
    const colonnes = props?.colonnes;
    if (colonnes && ![2, 3, 4, 5].includes(Number(colonnes))) {
      return fail('colonnes invalide (2 à 5)');
    }
    const partenaires = props?.partenaires;
    if (partenaires && !Array.isArray(partenaires)) {
      return fail('partenaires doit être un tableau');
    }
    return ok({
      partenaires: partenaires || [],
      colonnes: colonnes ? Number(colonnes) : 3,
      espacementMm: props?.espacementMm ?? 2,
    });
  },
  render({ props, ctx }) {
    const sources = (props.partenaires || [])
      .map((p) => ctx.assets.partenaireLogos?.[p.partenaireId])
      .filter(Boolean);
    if (sources.length === 0) return '';

    const rows = chunk(sources, props.colonnes);
    const rowsHtml = rows
      .map(
        (row) =>
          `<div class="el-logos-row" style="gap:${props.espacementMm}mm">${row
            .map((src) => `<div class="el-logo-cell"><img src="${src}" alt="" /></div>`)
            .join('')}</div>`,
      )
      .join('');

    return `<div class="el-logos-grid" style="gap:${props.espacementMm}mm">${rowsHtml}</div>`;
  },
});

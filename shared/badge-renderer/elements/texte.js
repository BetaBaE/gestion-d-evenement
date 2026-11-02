import { registerElement } from '../registry.js';
import { esc } from '../escape.js';
import { resolveTextVariables } from '../textVariables.js';
import { ok, fail } from '../validate.js';

/**
 * Dynamic text elements (champ, texte) render their raw, un-fit content
 * wrapped in a marker the browser-side fitting pass (fitDynamicTextInDom.js)
 * finds and rewrites after the page loads — never fit ahead of time here,
 * so the editor iframe and Puppeteer both run the exact same fitting logic
 * against the exact same rendered DOM (Addendum 3 v2 §7).
 */
function dynamicTextMarkup(rawText) {
  return `<span class="el-dynamictext" data-raw-text="${esc(rawText)}">${esc(rawText)}</span>`;
}

registerElement('champ', {
  defaultProps: { champ: 'nomPrenom', formatNom: 'Prénom NOM' },
  defaultSizeMm: { largeur: 50, hauteur: 10 },
  validateProps(props) {
    const champ = props?.champ;
    const valid = ['nomPrenom', 'nom', 'prenom', 'fonction', 'organisme', 'categorie', 'civilite', 'email', 'telephone'];
    if (!champ || !valid.includes(champ)) {
      return fail("champ invalide pour l'élément champ");
    }
    return ok({ champ, formatNom: props?.formatNom || 'Prénom NOM' });
  },
  render({ props, ctx }) {
    const value = resolveChampValue(props, ctx);
    if (!value) return '';
    return dynamicTextMarkup(value);
  },
});

function resolveChampValue(props, ctx) {
  const { participant, organisme, categorie } = ctx;
  switch (props.champ) {
    case 'nomPrenom': {
      const nom = (participant?.nom || '').toUpperCase();
      const prenom = participant?.prenom || '';
      return props.formatNom === 'NOM Prénom' ? `${nom} ${prenom}`.trim() : `${prenom} ${nom}`.trim();
    }
    case 'nom':
      return participant?.nom || '';
    case 'prenom':
      return participant?.prenom || '';
    case 'fonction':
      return participant?.fonction || '';
    case 'organisme':
      return organisme?.nom || '';
    case 'categorie':
      return categorie?.nom || '';
    case 'civilite':
      return participant?.civilite || '';
    case 'email':
      return participant?.email || '';
    case 'telephone':
      return participant?.telephone || '';
    default:
      return '';
  }
}

registerElement('texte', {
  defaultProps: { contenu: '' },
  defaultSizeMm: { largeur: 60, hauteur: 15 },
  validateProps(props) {
    if (props?.contenu && String(props.contenu).length > 1000) {
      return fail('contenu dépasse 1000 caractères');
    }
    return ok({ contenu: props?.contenu || '' });
  },
  render({ props, ctx }) {
    const resolved = resolveTextVariables(props.contenu, ctx);
    if (!resolved) return '';
    return dynamicTextMarkup(resolved);
  },
});

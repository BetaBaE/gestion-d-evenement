import { registerBlock } from '../registry.js';
import { esc, renderRichText, isValidHexColor, isValidHttpUrl } from '../escape.js';
import { ok, fail, clampNumber } from '../validate.js';

registerBlock('titrePilule', {
  defaultProps: { texte: '' },
  validateProps(props) {
    if (!props?.texte || String(props.texte).length > 100) {
      return fail('texte requis pour le bloc titrePilule (max 100 caractères)');
    }
    return ok({ texte: props.texte });
  },
  render({ props }) {
    return `<div class="bloc-pill">${esc(props.texte)}</div>`;
  },
});

registerBlock('texte', {
  defaultProps: { contenu: '', dir: 'ltr' },
  validateProps(props) {
    const dir = props?.dir;
    if (dir && !['ltr', 'rtl'].includes(dir)) {
      return fail('dir invalide pour le bloc texte');
    }
    if (props?.contenu && String(props.contenu).length > 1000) {
      return fail('contenu dépasse 1000 caractères');
    }
    return ok({ contenu: props?.contenu || '', dir: dir || 'ltr' });
  },
  render({ props }) {
    if (!props.contenu) return '';
    return `<div class="bloc-texte" dir="${props.dir}">${renderRichText(props.contenu)}</div>`;
  },
});

const ICON_GLYPHS = {
  calendrier: '📅',
  horloge: '🕐',
  lieu: '📍',
  ticket: '🎫',
  itineraire: '➡️',
  info: 'ℹ️',
  telephone: '📞',
  email: '✉️',
  wifi: '📶',
  repas: '🍽️',
  parking: '🅿️',
};

registerBlock('listeInfos', {
  defaultProps: { messageEnTete: '', items: [] },
  validateProps(props) {
    const items = props?.items;
    if (items && !Array.isArray(items)) {
      return fail('items doit être un tableau pour le bloc listeInfos');
    }
    for (const item of items || []) {
      if (item.icone && !(item.icone in ICON_GLYPHS)) {
        return fail(`icône inconnue: ${item.icone}`);
      }
    }
    return ok({ messageEnTete: props?.messageEnTete || '', items: items || [] });
  },
  render({ props }) {
    if (!props.messageEnTete && props.items.length === 0) return '';
    const rows = props.items
      .filter((item) => item.titre || item.texte)
      .map(
        (item) => `
        <div class="bloc-liste-infos-row">
          <span class="bloc-liste-infos-icon">${ICON_GLYPHS[item.icone] || 'ℹ️'}</span>
          <div><strong>${esc(item.titre)}</strong><div>${esc(item.texte)}</div></div>
        </div>`,
      )
      .join('');
    return `
      <div class="bloc-liste-infos">
        ${props.messageEnTete ? `<p class="bloc-liste-infos-intro">${esc(props.messageEnTete)}</p>` : ''}
        ${rows}
      </div>`;
  },
});

registerBlock('horaires', {
  defaultProps: { lignes: [] },
  validateProps(props) {
    const lignes = props?.lignes;
    if (lignes && !Array.isArray(lignes)) {
      return fail('lignes doit être un tableau pour le bloc horaires');
    }
    return ok({ lignes: lignes || [] });
  },
  render({ props }) {
    const rows = (props.lignes || []).filter((l) => l.libelleJours);
    if (rows.length === 0) return '';
    const lines = rows
      .map((l) => `<div>${esc(l.libelleJours)}${l.ouverture ? ` : ${esc(l.ouverture)} - ${esc(l.fermeture)}` : ''}</div>`)
      .join('');
    return `<div class="bloc-horaires"><strong>Horaires d'ouverture</strong>${lines}</div>`;
  },
});

registerBlock('encadre', {
  defaultProps: { texte: '', lien: '', style: 'contour' },
  validateProps(props) {
    const style = props?.style;
    if (style && !['contour', 'plein'].includes(style)) {
      return fail('style invalide pour le bloc encadre');
    }
    if (props?.lien && !isValidHttpUrl(props.lien) && !/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(props.lien)) {
      return fail('lien invalide pour le bloc encadre');
    }
    return ok({ texte: props?.texte || '', lien: props?.lien || '', style: style || 'contour' });
  },
  render({ props, ctx }) {
    if (!props.texte) return '';
    const styleClass = props.style === 'plein' ? 'bloc-encadre--plein' : 'bloc-encadre--contour';
    return `
      <div class="bloc-encadre ${styleClass}" style="border-color:${ctx.theme.couleurPrincipale}">
        ${esc(props.texte)}${props.lien ? ` <span class="bloc-encadre-lien" style="color:${ctx.theme.couleurPrincipale}">${esc(props.lien)}</span>` : ''}
      </div>`;
  },
});

registerBlock('image', {
  defaultProps: { hauteurMm: 20 },
  validateProps(props) {
    const hauteurMm = clampNumber(props?.hauteurMm, 5, 120, 20);
    return ok({ imageId: props?.imageId || null, hauteurMm });
  },
  render({ props, ctx }) {
    const src = ctx.assets.blockImages?.[props.imageId];
    if (!src) return '';
    return `<div class="bloc-image" style="height:${props.hauteurMm}mm"><img src="${src}" alt="" /></div>`;
  },
});

function chunk(array, size) {
  const rows = [];
  for (let i = 0; i < array.length; i += size) rows.push(array.slice(i, i + size));
  return rows;
}

registerBlock('groupePartenaires', {
  defaultProps: { titre: '', partenaires: [], colonnes: 3, tailleLogos: 'M' },
  validateProps(props) {
    const colonnes = props?.colonnes;
    if (colonnes && ![2, 3, 4].includes(Number(colonnes))) {
      return fail('colonnes invalide pour le bloc groupePartenaires (2, 3 ou 4)');
    }
    const partenaires = props?.partenaires;
    if (partenaires && !Array.isArray(partenaires)) {
      return fail('partenaires doit être un tableau');
    }
    return ok({
      titre: props?.titre || '',
      partenaires: partenaires || [],
      colonnes: colonnes ? Number(colonnes) : 3,
      tailleLogos: props?.tailleLogos || 'M',
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
          `<div class="bloc-logos-row">${row.map((src) => `<div class="bloc-logo-cell"><img src="${src}" alt="" /></div>`).join('')}</div>`,
      )
      .join('');

    return `
      <div class="bloc-groupe-partenaires">
        ${props.titre ? `<div class="bloc-pill">${esc(props.titre)}</div>` : ''}
        <div class="bloc-logos-grid bloc-logos-grid--cols-${props.colonnes}">${rowsHtml}</div>
      </div>`;
  },
});

registerBlock('encartPromo', {
  defaultProps: { titre: '', pastille: '', texte: '', couleur: '#e8732c' },
  validateProps(props) {
    if (props?.couleur && !isValidHexColor(props.couleur)) {
      return fail('couleur invalide pour le bloc encartPromo');
    }
    return ok({
      titre: props?.titre || '',
      pastille: props?.pastille || '',
      texte: props?.texte || '',
      couleur: props?.couleur || '#e8732c',
      partenaireId: props?.partenaireId || null,
    });
  },
  render({ props, ctx }) {
    if (!props.titre) return '';
    const logo = ctx.assets.partenaireLogos?.[props.partenaireId];
    return `
      <div class="bloc-encart-promo" style="background:${esc(props.couleur)}">
        ${props.pastille ? `<div class="bloc-promo-pastille">${esc(props.pastille)}</div>` : ''}
        <div class="bloc-promo-titre">${esc(props.titre)}</div>
        ${props.texte ? `<div class="bloc-promo-texte">${esc(props.texte)}</div>` : ''}
        ${logo ? `<img class="bloc-promo-logo" src="${logo}" alt="" />` : ''}
      </div>`;
  },
});

registerBlock('siteEtReseaux', {
  defaultProps: {},
  validateProps(props) {
    return ok({
      siteWeb: props?.siteWeb || '',
      facebook: props?.facebook || '',
      instagram: props?.instagram || '',
      linkedin: props?.linkedin || '',
      youtube: props?.youtube || '',
      x: props?.x || '',
    });
  },
  render({ props }) {
    const liens = [props.siteWeb, props.facebook, props.instagram, props.linkedin, props.youtube, props.x].filter(
      Boolean,
    );
    if (liens.length === 0) return '';
    return `<div class="bloc-site-reseaux">${liens.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
  },
});

registerBlock('separateur', {
  defaultProps: { style: 'ligne' },
  validateProps(props) {
    const style = props?.style;
    if (style && !['ligne', 'espace'].includes(style)) {
      return fail('style invalide pour le bloc separateur');
    }
    return ok({ style: style || 'ligne' });
  },
  render({ props, ctx }) {
    if (props.style === 'espace') return `<div class="bloc-separateur-espace"></div>`;
    return `<hr class="bloc-separateur-ligne" style="border-color:${ctx.theme.couleurPrincipale}" />`;
  },
});

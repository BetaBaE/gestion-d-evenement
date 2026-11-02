import { registerBlock } from '../registry.js';
import { esc } from '../escape.js';
import { ok, fail } from '../validate.js';

function formatDateRange(dateDebut, dateFin, format) {
  if (!dateDebut || !dateFin) return '';
  const opts =
    format === 'court'
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
  const d1 = new Date(dateDebut).toLocaleDateString('fr-FR', opts);
  const d2 = new Date(dateFin).toLocaleDateString('fr-FR', opts);
  return d1 === d2 ? d1 : `${d1} - ${d2}`;
}

registerBlock('enteteEvenement', {
  defaultProps: {
    mode: 'genere',
    patronageAr: '',
    patronageFr: '',
    titre: '',
    parLigne: '',
    edition: '',
    afficherDates: true,
    descriptif: '',
    degrade: true,
  },
  validateProps(props) {
    const mode = props?.mode;
    if (mode && !['genere', 'image'].includes(mode)) {
      return fail('mode invalide pour le bloc enteteEvenement');
    }
    const maxLenFields = ['patronageAr', 'patronageFr', 'titre', 'parLigne', 'edition', 'descriptif'];
    for (const field of maxLenFields) {
      if (props?.[field] && String(props[field]).length > 300) {
        return fail(`${field} dépasse 300 caractères`);
      }
    }
    return ok({
      mode: mode || 'genere',
      banniereImageId: props?.banniereImageId || null,
      logoImageId: props?.logoImageId || null,
      patronageAr: props?.patronageAr || '',
      patronageFr: props?.patronageFr || '',
      titre: props?.titre || '',
      parLigne: props?.parLigne || '',
      edition: props?.edition || '',
      afficherDates: props?.afficherDates !== false,
      descriptif: props?.descriptif || '',
      degrade: props?.degrade !== false,
    });
  },
  render({ props, ctx }) {
    if (props.mode === 'image' && ctx.assets.enteteBanniere) {
      return `<div class="bloc-entete bloc-entete--image"><img src="${ctx.assets.enteteBanniere}" alt="" /></div>`;
    }

    const titre = props.titre || ctx.event.titre;
    const patronage =
      props.patronageAr || props.patronageFr
        ? `<div class="bloc-entete-patronage">
            ${props.patronageAr ? `<div dir="rtl" lang="ar" class="bloc-entete-patronage-ar">${esc(props.patronageAr)}</div>` : ''}
            ${props.patronageFr ? `<div class="bloc-entete-patronage-fr">${esc(props.patronageFr)}</div>` : ''}
          </div>`
        : '';
    const dates = props.afficherDates ? formatDateRange(ctx.event.dateDebut, ctx.event.dateFin, 'long') : '';

    const bg = props.degrade
      ? `linear-gradient(135deg, ${ctx.theme.couleurSecondaire}, #ffffff)`
      : ctx.theme.couleurSecondaire;

    return `
      <div class="bloc-entete" style="background:${bg}">
        ${patronage}
        <div class="bloc-entete-row">
          ${ctx.assets.enteteLogo ? `<img class="bloc-entete-logo" src="${ctx.assets.enteteLogo}" alt="" />` : ''}
          <div class="bloc-entete-titres">
            <div class="bloc-entete-titre">${esc(titre)}</div>
            ${props.parLigne ? `<div class="bloc-entete-par-ligne">${esc(props.parLigne)}</div>` : ''}
            ${props.edition ? `<div class="bloc-entete-edition">${esc(props.edition)}</div>` : ''}
            ${dates ? `<div class="bloc-entete-dates">${esc(dates)}</div>` : ''}
          </div>
        </div>
        ${props.descriptif ? `<div class="bloc-entete-descriptif">${esc(props.descriptif)}</div>` : ''}
      </div>`;
  },
});

registerBlock('enteteCompact', {
  defaultProps: { afficherSiteWeb: true, afficherReseaux: false },
  validateProps(props) {
    return ok({
      logoImageId: props?.logoImageId || null,
      afficherSiteWeb: props?.afficherSiteWeb !== false,
      afficherReseaux: !!props?.afficherReseaux,
    });
  },
  render({ props, ctx }) {
    const liens = [];
    if (props.afficherSiteWeb && ctx.event.badgeConfig?.siteWeb) {
      liens.push(`<div>${esc(ctx.event.badgeConfig.siteWeb)}</div>`);
    }
    if (props.afficherReseaux && ctx.event.badgeConfig?.reseauxSociaux) {
      const reseaux = Object.values(ctx.event.badgeConfig.reseauxSociaux).filter(Boolean);
      reseaux.forEach((r) => liens.push(`<div>${esc(r)}</div>`));
    }
    return `
      <div class="bloc-entete-compact">
        ${ctx.assets.enteteCompactLogo ? `<img class="bloc-entete-compact-logo" src="${ctx.assets.enteteCompactLogo}" alt="" />` : ''}
        <div class="bloc-entete-compact-liens">${liens.join('')}</div>
      </div>`;
  },
});

registerBlock('datesEvenement', {
  defaultProps: { format: 'long' },
  validateProps(props) {
    const format = props?.format;
    if (format && !['court', 'long'].includes(format)) {
      return fail('format invalide pour le bloc datesEvenement');
    }
    return ok({ format: format || 'long' });
  },
  render({ props, ctx }) {
    const text = formatDateRange(ctx.event.dateDebut, ctx.event.dateFin, props.format);
    if (!text) return '';
    return `<div class="bloc-dates-evenement">${esc(text)}</div>`;
  },
});

registerBlock('logoOrganisateur', {
  defaultProps: { taille: 'M' },
  validateProps(props) {
    const taille = props?.taille;
    if (taille && !['S', 'M', 'L', 'XL'].includes(taille)) {
      return fail('taille invalide pour le bloc logoOrganisateur');
    }
    return ok({ taille: taille || 'M' });
  },
  render({ props, ctx }) {
    if (!ctx.assets.organisateurLogo) return '';
    return `<div class="bloc-logo-organisateur bloc-logo-organisateur--${props.taille}"><img src="${ctx.assets.organisateurLogo}" alt="" /></div>`;
  },
});

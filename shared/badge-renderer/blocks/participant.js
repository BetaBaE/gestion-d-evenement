import { registerBlock } from '../registry.js';
import { esc } from '../escape.js';
import { ok, fail, clampNumber } from '../validate.js';

function formatNom(participant, format) {
  const nom = (participant.nom || '').toUpperCase();
  const prenom = participant.prenom || '';
  if (format === 'Prénom NOM') return `${prenom} ${nom}`.trim();
  if (format === 'NOM Prénom') return `${nom} ${prenom}`.trim();
  return `${prenom.toUpperCase()} ${nom}`.trim();
}

registerBlock('nomPrenom', {
  defaultProps: { format: 'NOM Prénom' },
  validateProps(props) {
    const format = props?.format;
    if (format && !['NOM Prénom', 'Prénom NOM', 'NOM PRÉNOM'].includes(format)) {
      return fail('format invalide pour le bloc nomPrenom');
    }
    return ok({ format: format || 'NOM Prénom' });
  },
  render({ props, ctx }) {
    const text = formatNom(ctx.participant, props.format);
    return `<div class="bloc-nom-prenom">${esc(text)}</div>`;
  },
});

registerBlock('fonction', {
  defaultProps: {},
  validateProps() {
    return ok({});
  },
  render({ ctx }) {
    if (!ctx.participant.fonction) return '';
    return `<div class="bloc-fonction">${esc(ctx.participant.fonction)}</div>`;
  },
});

registerBlock('organisme', {
  defaultProps: { afficher: 'nom' },
  validateProps(props) {
    const afficher = props?.afficher;
    if (afficher && !['nom', 'logo', 'les deux'].includes(afficher)) {
      return fail('afficher invalide pour le bloc organisme');
    }
    return ok({ afficher: afficher || 'nom' });
  },
  render({ props, ctx }) {
    const organisme = ctx.organisme;
    if (!organisme) return '';
    const showLogo = props.afficher === 'logo' || props.afficher === 'les deux';
    const showNom = props.afficher === 'nom' || props.afficher === 'les deux';
    const logoSrc = ctx.assets.organismeLogo;
    const parts = [];
    if (showLogo && logoSrc) {
      parts.push(`<img class="bloc-organisme-logo" src="${logoSrc}" alt="" />`);
    }
    if (showNom && organisme.nom) {
      parts.push(`<div class="bloc-organisme-nom">${esc(organisme.nom)}</div>`);
    }
    if (parts.length === 0) return '';
    return `<div class="bloc-organisme">${parts.join('')}</div>`;
  },
});

registerBlock('photo', {
  defaultProps: { forme: 'rond' },
  validateProps(props) {
    const forme = props?.forme;
    if (forme && !['carre', 'rond'].includes(forme)) {
      return fail('forme invalide pour le bloc photo');
    }
    return ok({ forme: forme || 'rond' });
  },
  render({ props, ctx }) {
    const src = ctx.assets.participantPhoto;
    if (!src) return '';
    const shapeClass = props.forme === 'carre' ? 'bloc-photo--carre' : 'bloc-photo--rond';
    return `<div class="bloc-photo ${shapeClass}"><img src="${src}" alt="" /></div>`;
  },
});

registerBlock('qrCode', {
  defaultProps: { tailleMm: 55 },
  validateProps(props) {
    const tailleMm = clampNumber(props?.tailleMm, 30, 65, 55);
    return ok({ tailleMm });
  },
  render({ props, ctx }) {
    if (!ctx.assets.qrCodeSvg) return '';
    return `<div class="bloc-qr" style="width:${props.tailleMm}mm;height:${props.tailleMm}mm">${ctx.assets.qrCodeSvg}</div>`;
  },
});

const CATEGORIE_FALLBACK_COLOR = '#1971c2';

registerBlock('bandeCategorie', {
  defaultProps: { texte: 'auto' },
  validateProps(props) {
    const texte = props?.texte;
    if (texte && texte !== 'auto' && typeof texte !== 'string') {
      return fail('texte invalide pour le bloc bandeCategorie');
    }
    return ok({ texte: texte || 'auto' });
  },
  render({ props, ctx }) {
    const label = props.texte === 'auto' || !props.texte ? ctx.categorie?.nom || '' : props.texte;
    const color = ctx.categorie?.couleur || ctx.theme.couleurPrincipale || CATEGORIE_FALLBACK_COLOR;
    return `<div class="bloc-bande-categorie" style="background:${esc(color)}"><span>${esc(label)}</span></div>`;
  },
});

const CHAMP_LABELS = { civilite: 'Civilité', email: 'Email', telephone: 'Téléphone' };

registerBlock('champParticipant', {
  defaultProps: { champ: 'email' },
  validateProps(props) {
    const champ = props?.champ;
    if (!champ || !['civilite', 'email', 'telephone'].includes(champ)) {
      return fail('champ invalide pour le bloc champParticipant');
    }
    return ok({ champ });
  },
  render({ props, ctx }) {
    const value = ctx.participant[props.champ];
    if (!value) return '';
    return `<div class="bloc-champ-participant"><strong>${esc(CHAMP_LABELS[props.champ])} :</strong> ${esc(value)}</div>`;
  },
});

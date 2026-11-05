import { registerElement } from '../registry.js';
import { dynamicTextMarkup } from './texte.js';
import { ok, fail } from '../validate.js';
import { DEFAULT_TIMEZONE, formatDateRangeLong, formatDateRangeMoisCourt } from '../variables.js';

registerElement('qrCode', {
  defaultProps: { couleur: '#000000', fond: '#ffffff', niveauCorrection: 'M' },
  defaultSizeMm: { largeur: 45, hauteur: 45 },
  validateProps(props) {
    const niveauCorrection = props?.niveauCorrection;
    if (niveauCorrection && !['L', 'M', 'Q', 'H'].includes(niveauCorrection)) {
      return fail('niveauCorrection invalide pour le QR code');
    }
    return ok({
      couleur: props?.couleur || '#000000',
      fond: props?.fond || '#ffffff',
      niveauCorrection: niveauCorrection || 'M',
    });
  },
  render({ ctx }) {
    if (!ctx.assets.qrCodeSvg) return '';
    return `<div class="el-qr">${ctx.assets.qrCodeSvg}</div>`;
  },
});

registerElement('photo', {
  defaultProps: { forme: 'rond' },
  defaultSizeMm: { largeur: 25, hauteur: 25 },
  validateProps(props) {
    const forme = props?.forme;
    if (forme && !['carre', 'rond', 'arrondi'].includes(forme)) {
      return fail('forme invalide pour la photo');
    }
    return ok({ forme: forme || 'rond', placeholder: !!props?.placeholder });
  },
  render({ props, ctx }) {
    const src = ctx.assets.participantPhoto;
    if (!src && !props.placeholder) return '';
    const shapeClass = { carre: '', rond: 'el-photo--rond', arrondi: 'el-photo--arrondi' }[props.forme] || '';
    if (!src) {
      return `<div class="el-photo-placeholder ${shapeClass}"></div>`;
    }
    return `<img class="el-photo ${shapeClass}" src="${src}" alt="" />`;
  },
});

registerElement('image', {
  defaultProps: { ajustement: 'contain' },
  defaultSizeMm: { largeur: 30, hauteur: 30 },
  validateProps(props) {
    const ajustement = props?.ajustement;
    if (ajustement && !['contain', 'cover'].includes(ajustement)) {
      return fail('ajustement invalide pour l\'image');
    }
    return ok({ imageId: props?.imageId || null, ajustement: ajustement || 'contain' });
  },
  render({ props, ctx }) {
    const src = ctx.assets.freeImages?.[props.imageId];
    if (!src) return '';
    return `<img class="el-image" style="object-fit:${props.ajustement}" src="${src}" alt="" />`;
  },
});

registerElement('logoOrganisateur', {
  defaultProps: {},
  defaultSizeMm: { largeur: 30, hauteur: 15 },
  validateProps() {
    return ok({});
  },
  render({ ctx }) {
    if (!ctx.assets.organisateurLogo) return '';
    return `<img class="el-logo" src="${ctx.assets.organisateurLogo}" alt="" />`;
  },
});

registerElement('logoOrganisme', {
  defaultProps: {},
  defaultSizeMm: { largeur: 30, hauteur: 15 },
  validateProps() {
    return ok({});
  },
  render({ ctx }) {
    if (!ctx.assets.organismeLogo) return '';
    return `<img class="el-logo" src="${ctx.assets.organismeLogo}" alt="" />`;
  },
});

registerElement('dates', {
  defaultProps: { format: 'long' },
  defaultSizeMm: { largeur: 40, hauteur: 8 },
  validateProps(props) {
    const format = props?.format;
    if (format && !['court', 'long'].includes(format)) {
      return fail('format invalide pour les dates');
    }
    return ok({ format: format || 'long' });
  },
  render({ props, ctx }) {
    // Same formatting as {{event.dates}}, in the app's time zone (not the server's).
    const tz = ctx.timezone || DEFAULT_TIMEZONE;
    const text =
      props.format === 'court'
        ? formatDateRangeMoisCourt(ctx.event?.dateDebut, ctx.event?.dateFin, tz)
        : formatDateRangeLong(ctx.event?.dateDebut, ctx.event?.dateFin, tz);
    if (!text) return '';
    return dynamicTextMarkup(text);
  },
});

import './elements/texte.js';
import './elements/participant.js';
import './elements/contenu.js';
import { getElementDefinition, hasElementType } from './registry.js';
import { styleToCss } from './style.js';

export {
  registerElement,
  getElementDefinition,
  hasElementType,
  listElementTypes,
  getDefaultProps,
  getDefaultSizeMm,
} from './registry.js';
export { esc, renderRichText, isValidHexColor, isValidHttpUrl } from './escape.js';
export { nanoid } from './nanoid.js';
export { STARTER_TEMPLATES } from './templates.js';
export { resolveTextVariables, listTextVariables } from './textVariables.js';
export { fitText } from './textFit.js';
export { fitDynamicTextInDom } from './fitDynamicTextInDom.js';
export { styleToCss, resolveToken } from './style.js';

const FONT_STACKS = {
  titres: "'Montserrat', 'Segoe UI', Arial, sans-serif",
  texte: "'Open Sans', 'Segoe UI', Arial, sans-serif",
  nom: "'Merriweather', Georgia, 'Times New Roman', serif",
  arabe: "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Segoe UI', sans-serif",
};

export const SAFE_ZONE_DEFAULT_MM = 5;

export function panelSizeMm(badge) {
  if (badge.format === 'A6') return { width: 105, height: 148.5 };
  if (badge.format === 'CARTE') {
    return { width: badge.carteLargeurMm || 85.6, height: badge.carteHauteurMm || 54 };
  }
  return { width: 105, height: 148.5 };
}

function baseCss(theme) {
  const policeTitres = theme.policeTitres ? `'${theme.policeTitres}', ${FONT_STACKS.titres}` : FONT_STACKS.titres;
  const policeTexte = theme.policeTexte ? `'${theme.policeTexte}', ${FONT_STACKS.texte}` : FONT_STACKS.texte;
  const policeNom = theme.policeNom ? `'${theme.policeNom}', ${FONT_STACKS.nom}` : FONT_STACKS.nom;

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${policeTexte}; color: ${theme.couleurTexte}; }
    .panel { position: relative; overflow: hidden; background: #fff; }
    .el-wrapper { position: absolute; overflow: hidden; box-sizing: border-box; }
    .el-wrapper .el-dynamictext { font-family: ${policeTexte}; }
    .el-line { display: block; white-space: nowrap; }
    .el-nom .el-dynamictext { font-family: ${policeNom}; }
    .el-titres .el-dynamictext { font-family: ${policeTitres}; }
    .el-qr { width: 100%; height: 100%; }
    .el-qr svg { width: 100%; height: 100%; }
    .el-photo, .el-photo-placeholder { width: 100%; height: 100%; object-fit: cover; display: block; }
    .el-photo--rond, .el-photo-placeholder.el-photo--rond { border-radius: 50%; }
    .el-photo--arrondi, .el-photo-placeholder.el-photo--arrondi { border-radius: 10%; }
    .el-photo-placeholder { background: #e0e0e0; }
    .el-image { width: 100%; height: 100%; display: block; }
    .el-logo { width: 100%; height: 100%; object-fit: contain; display: block; }
    .el-logos-grid { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; }
    .el-logos-row { display: flex; justify-content: center; align-items: center; }
    .el-logo-cell { flex: 1 1 0; display: flex; align-items: center; justify-content: center; min-width: 0; }
    .el-logo-cell img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .safe-zone { position: absolute; border: 0.2mm dashed rgba(255,0,0,0.4); pointer-events: none; }
  `;
}

function layoutCss(badge) {
  if (badge.format !== 'A4_PLIE_4') {
    const { width, height } = panelSizeMm(badge);
    return `
      @page { size: ${width}mm ${height}mm; margin: 0; }
      body { width: ${width}mm; height: ${height}mm; }
      .sheet { width: ${width}mm; height: ${height}mm; }
      .panel { width: ${width}mm; height: ${height}mm; }
      .panel-P2, .panel-P3, .panel-P4 { display: none; }
    `;
  }

  const rotation = badge.rotationLigneBas180 ? '.panel-P2, .panel-P4 { transform: rotate(180deg); }' : '';
  const foldLines =
    badge.traitsDePliage !== false
      ? `
      .sheet::before, .sheet::after { content: ''; position: absolute; background: repeating-linear-gradient(to right, #ccc 0, #ccc 2mm, transparent 2mm, transparent 4mm); }
      .sheet::before { top: 148.5mm; left: 0; width: 210mm; height: 0.2mm; }
      .sheet::after { top: 0; left: 105mm; width: 0.2mm; height: 297mm; background: repeating-linear-gradient(to bottom, #ccc 0, #ccc 2mm, transparent 2mm, transparent 4mm); }
    `
      : '';

  return `
    @page { size: 210mm 297mm; margin: 0; }
    body { width: 210mm; height: 297mm; }
    .sheet { position: relative; width: 210mm; height: 297mm; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; }
    .panel { width: 105mm; height: 148.5mm; }
    ${foldLines}
    ${rotation}
  `;
}

function singlePanelLayoutCss(badge) {
  const { width, height } = panelSizeMm(badge);
  return `
    @page { size: ${width}mm ${height}mm; margin: 0; }
    body { width: ${width}mm; height: ${height}mm; }
    .sheet { width: ${width}mm; height: ${height}mm; }
    .panel { width: ${width}mm; height: ${height}mm; }
  `;
}

function elementMatchesCategorie(element, categorie) {
  const visibleSi = element.visibleSi;
  if (!visibleSi || !visibleSi.categories || visibleSi.categories.length === 0) return true;
  if (!categorie) return false;
  return visibleSi.categories.some((id) => String(id) === String(categorie._id || categorie.id));
}

function elementClassName(element) {
  if (element.type === 'champ' && element.props?.champ === 'nomPrenom') return 'el-nom';
  if (element.type === 'bandeCategorie' || element.props?.titrePilule) return 'el-titres';
  return '';
}

function renderElement(element, ctx) {
  if (element.masque) return '';
  if (!elementMatchesCategorie(element, ctx.categorie)) return '';
  if (!hasElementType(element.type)) return '';

  const def = getElementDefinition(element.type);
  const validated = def.validateProps(element.props || {});
  if (!validated.valid) return '';

  const box = { widthMm: element.largeur, heightMm: element.hauteur };
  const inner = def.render({ props: validated.value, style: element.style || {}, box, ctx, measureTextWidthMm: ctx.measureTextWidthMm });
  // A `forme` element renders no inner HTML by design (its background/
  // border comes entirely from styleToCss) — every other type returning ''
  // means "nothing to show" (e.g. no photo uploaded) and should be skipped.
  if (!inner && element.type !== 'forme') return '';

  const categorieColor = ctx.categorie?.couleur;
  const styleCss = styleToCss(element.style, ctx.theme, categorieColor);
  const transform = element.rotation ? `transform:rotate(${element.rotation}deg);` : '';
  const positionCss = `left:${element.x}mm;top:${element.y}mm;width:${element.largeur}mm;height:${element.hauteur}mm;z-index:${element.z ?? 0};${transform}`;

  const dataAttrs = [
    `data-element-id="${element.id || ''}"`,
    `data-element-type="${element.type}"`,
    `data-taille-max="${element.style?.tailleMax ?? 14}"`,
    `data-taille-min="${element.style?.tailleMin ?? 6}"`,
    `data-interligne="${element.style?.interligne ?? 1.2}"`,
    `data-lignes-max="${element.style?.lignesMax ?? 1}"`,
  ].join(' ');

  return `<div class="el-wrapper ${elementClassName(element)}" ${dataAttrs} style="${positionCss}${styleCss}">${inner}</div>`;
}

function renderPanel(panelKey, elements, ctx, showSafeZone, safeZoneMm) {
  const panelElements = (elements || []).filter((el) => el.panneau === panelKey).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const elementsHtml = panelElements.map((el) => renderElement(el, ctx)).join('');
  const safeZoneHtml = showSafeZone
    ? `<div class="safe-zone" style="left:${safeZoneMm}mm;top:${safeZoneMm}mm;right:${safeZoneMm}mm;bottom:${safeZoneMm}mm;"></div>`
    : '';
  return `<section class="panel panel-${panelKey}">${elementsHtml}${safeZoneHtml}</section>`;
}

function buildCtx({ theme, participant, event, organisme, organisateur, categorie, assets, measureTextWidthMm }) {
  return { participant, event, organisme, organisateur, categorie, theme, assets: assets || {}, measureTextWidthMm };
}

/**
 * Renders exactly one panel's HTML, sized to that single panel regardless
 * of the overall multi-panel format. Used by the editor's per-panel canvas
 * (one panel per editable box) rather than a whole A4 sheet.
 */
export function renderSinglePanelHtml({ panelKey, badge, theme, participant, event, organisme, organisateur, categorie, assets, measureTextWidthMm, showSafeZone }) {
  const ctx = buildCtx({ theme, participant, event, organisme, organisateur, categorie, assets, measureTextWidthMm });
  const panelHtml = renderPanel(panelKey, badge.elements, ctx, showSafeZone, badge.safeZoneMm ?? SAFE_ZONE_DEFAULT_MM);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>${baseCss(theme)}${singlePanelLayoutCss(badge)}</style>
</head>
<body>
  <div class="sheet">${panelHtml}</div>
</body>
</html>`;
}

/**
 * Renders the full badge HTML document for one participant. `assets` must
 * already be resolved (data URIs on the server, authenticated /api/images/:id
 * URLs on the client) — this function never fetches anything itself, so the
 * same code runs in both places. Dynamic text is emitted raw (see
 * elements/texte.js) — call fitDynamicTextInDom() against the resulting
 * document before treating it as final output.
 */
export function renderBadgeHtml({ badge, theme, participant, event, organisme, organisateur, categorie, assets, measureTextWidthMm, showSafeZone }) {
  const ctx = buildCtx({ theme, participant, event, organisme, organisateur, categorie, assets, measureTextWidthMm });

  const panels = ['P1', 'P2', 'P3', 'P4'].map((key) =>
    renderPanel(key, badge.elements, ctx, showSafeZone, badge.safeZoneMm ?? SAFE_ZONE_DEFAULT_MM),
  );
  const sheetHtml = badge.format === 'A4_PLIE_4' ? panels.join('') : panels[0];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>${baseCss(theme)}${layoutCss(badge)}</style>
</head>
<body>
  <div class="sheet">${sheetHtml}</div>
</body>
</html>`;
}

/**
 * Renders one HTML document containing every participant's sheet, each on
 * its own printed page, sharing a single <style> block (always the same
 * event/badge config across a batch).
 */
export function renderBatchBadgeHtml(entries) {
  if (entries.length === 0) return '<!DOCTYPE html><html><body></body></html>';
  const { badge, theme } = entries[0];

  const sheets = entries.map(({ participant, event, organisme, organisateur, categorie, assets }) => {
    const ctx = buildCtx({ theme, participant, event, organisme, organisateur, categorie, assets });
    const panels = ['P1', 'P2', 'P3', 'P4'].map((key) => renderPanel(key, badge.elements, ctx, false, badge.safeZoneMm ?? SAFE_ZONE_DEFAULT_MM));
    return badge.format === 'A4_PLIE_4' ? panels.join('') : panels[0];
  });

  const pages = sheets
    .map((sheet, i) => `<div${i > 0 ? ' style="page-break-before: always;"' : ''}><div class="sheet">${sheet}</div></div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>${baseCss(theme)}${layoutCss(badge)}</style>
</head>
<body>${pages}</body>
</html>`;
}

import './elements/texte.js';
import './elements/participant.js';
import './elements/contenu.js';
import { getElementDefinition, hasElementType } from './registry.js';
import { styleToCss } from './style.js';
import { esc } from './escape.js';
import { activePanelKeys } from './panels.js';

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
export { STARTER_TEMPLATES, DEFAULT_STARTER_KEY, FORMAT_LABELS } from './templates.js';
export { ALL_PANELS, activePanelKeys, elementsHorsPage } from './panels.js';
export { ICONS } from './icons.js';
export { checkBadgeRules, hasBlockingRules } from './rules.js';
export { createHistory, historyReducer, undoLabel, redoLabel, HISTORY_LIMIT } from './editorHistory.js';
export {
  VARIABLES,
  VARIABLE_GROUPS,
  VARIABLE_ALIASES,
  DEFAULT_TIMEZONE,
  getVariable,
  isKnownVariable,
  resolveVariable,
  extractVariables,
  unknownVariables,
  resolveTextVariables,
  listTextVariables,
  listVariablesByGroup,
} from './variables.js';
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

// Fonts selectable in the editor (Addendum 3 v2 §5.5: only bundled fonts,
// no uploads). Not bundled as files yet — each falls back to a system stack.
export const ALLOWED_FONTS = ['Montserrat', 'Open Sans', 'Merriweather', 'Noto Naskh Arabic'];

export const COLOR_TOKENS = ['principale', 'secondaire', 'accent', 'texte', 'categorie', 'blanc', 'noir'];

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
    .el-icone { width: 100%; height: 100%; display: block; }
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
    .el-forme--pilule { border-radius: 999mm !important; }
    .el-forme--cercle { border-radius: 50% !important; }
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
    .panel-P1 { grid-row: 1; grid-column: 1; }
    .panel-P3 { grid-row: 1; grid-column: 2; }
    .panel-P2 { grid-row: 2; grid-column: 1; }
    .panel-P4 { grid-row: 2; grid-column: 2; }
    ${foldLines}
    ${rotation}
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

const EDITOR_PLACEHOLDER_LABELS = {
  champ: 'Champ vide',
  texte: 'Texte vide',
  qrCode: 'QR code',
  photo: 'Photo',
  image: 'Image',
  logoOrganisateur: 'Logo organisateur',
  logoOrganisme: 'Logo organisme',
  grillePartenaires: 'Partenaires',
  dates: 'Dates',
  bandeCategorie: 'Catégorie',
  icone: 'Icône',
};

function renderElement(element, ctx) {
  if (element.masque) return '';
  const categorieMatches = elementMatchesCategorie(element, ctx.categorie);
  if (!categorieMatches && !ctx.editorMode) return '';
  if (!hasElementType(element.type)) return '';

  const def = getElementDefinition(element.type);
  const validated = def.validateProps(element.props || {});
  if (!validated.valid) return '';

  const box = { widthMm: element.largeur, heightMm: element.hauteur };
  let inner = def.render({ props: validated.value, style: element.style || {}, box, ctx, measureTextWidthMm: ctx.measureTextWidthMm });
  const extraClasses = [];
  // A `forme` element renders no inner HTML by design (its background/
  // border comes entirely from styleToCss) — every other type returning ''
  // means "nothing to show" (e.g. no photo uploaded) and is skipped in the
  // printed output. In the editor it still needs a visible, selectable box.
  if (!inner && element.type !== 'forme') {
    if (!ctx.editorMode) return '';
    inner = `<span class="el-placeholder">${EDITOR_PLACEHOLDER_LABELS[element.type] || element.type}</span>`;
    extraClasses.push('el-empty');
  }
  if (!categorieMatches) extraClasses.push('el-ghost');
  if (element.type === 'forme') extraClasses.push(`el-forme--${validated.value.forme}`);

  const categorieColor = ctx.categorie?.couleur;
  const styleCss = styleToCss(element.style, ctx.theme, categorieColor);
  const transform = element.rotation ? `transform:rotate(${element.rotation}deg);` : '';
  const positionCss = `left:${element.x}mm;top:${element.y}mm;width:${element.largeur}mm;height:${element.hauteur}mm;z-index:${element.z ?? 0};${transform}`;

  const dataAttrs = [
    `data-element-id="${esc(element.id || '')}"`,
    `data-element-type="${esc(element.type)}"`,
    `data-taille-max="${element.style?.tailleMax ?? 14}"`,
    `data-taille-min="${element.style?.tailleMin ?? 6}"`,
    `data-interligne="${element.style?.interligne ?? 1.2}"`,
    `data-lignes-max="${element.style?.lignesMax ?? 1}"`,
  ].join(' ');

  const classes = ['el-wrapper', elementClassName(element), ...extraClasses].filter(Boolean).join(' ');
  return `<div class="${classes}" ${dataAttrs} style="${esc(positionCss + styleCss)}">${inner}</div>`;
}

function renderPanel(panelKey, elements, ctx, showSafeZone, safeZoneMm, activePanels = ['P1', 'P2', 'P3', 'P4']) {
  // Elements on a panel that doesn't print ("hors page") are never rendered.
  const panelElements = (activePanels.includes(panelKey) ? elements || [] : []).filter((el) => el.panneau === panelKey).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const elementsHtml = panelElements.map((el) => renderElement(el, ctx)).join('');
  const safeZoneHtml = showSafeZone
    ? `<div class="safe-zone" style="left:${safeZoneMm}mm;top:${safeZoneMm}mm;right:${safeZoneMm}mm;bottom:${safeZoneMm}mm;"></div>`
    : '';
  return `<section class="panel panel-${panelKey}">${elementsHtml}${safeZoneHtml}</section>`;
}

// timezone (APP_TIMEZONE), numero (participant number in the event) and
// dateImpression feed the text variables (variables.js).
function buildCtx({ theme, participant, event, organisme, organisateur, categorie, assets, measureTextWidthMm, editorMode, timezone, numero, dateImpression }) {
  return { participant, event, organisme, organisateur, categorie, theme, assets: assets || {}, measureTextWidthMm, editorMode: !!editorMode, timezone, numero, dateImpression };
}

/**
 * Prefixes every top-level selector in `css` with `scope` so the renderer's
 * stylesheet (which includes a `*` reset and `body` rules meant for a
 * standalone page) can be injected into the admin app without leaking.
 * Only handles the flat rule lists this module itself generates — no
 * nested at-rules (callers strip @page first).
 */
function scopeCss(css, scope) {
  return css.replace(/(^|})\s*([^{}@]+)\{/g, (_match, close, selectors) => {
    const scoped = selectors
      .split(',')
      .map((sel) => sel.trim())
      .filter(Boolean)
      .map((sel) => {
        if (sel === 'body') return scope;
        if (sel === '*') return `${scope} *`;
        return `${scope} ${sel}`;
      })
      .join(', ');
    return `${close} ${scoped} {`;
  });
}

const EDITOR_CSS = `
  .el-empty { outline: 0.3mm dashed #9aa5b1; outline-offset: -0.3mm; background: rgba(154,165,177,0.08); }
  .el-placeholder { font: 500 2.6mm/1.2 'Segoe UI', Arial, sans-serif; color: #6b7785; margin: auto; text-align: center; }
  .el-ghost { opacity: 0.35; }
`;

/**
 * Editor variant of renderBadgeHtml (Addendum 3 v2 §4.1): same markup and
 * the same element renderers, so the canvas is the print output, but
 * returned as { css, html } for injection into the admin page — CSS scoped
 * under `scope`, no @page rules, empty elements shown as placeholders so
 * they stay selectable, elements hidden for this category shown faded, and
 * the bottom-row 180° print rotation not applied (editing upside down would
 * invert every drag).
 */
export function renderEditorSheet({ badge, theme, participant, event, organisme, organisateur, categorie, assets, scope, timezone, numero }) {
  const ctx = buildCtx({ theme, participant, event, organisme, organisateur, categorie, assets, editorMode: true, timezone, numero });
  const safeZoneMm = badge.safeZoneMm ?? SAFE_ZONE_DEFAULT_MM;
  const panels = ['P1', 'P2', 'P3', 'P4'].map((key) => renderPanel(key, badge.elements, ctx, true, safeZoneMm, activePanelKeys(badge)));
  const sheetHtml = badge.format === 'A4_PLIE_4' ? panels.join('') : panels[0];

  const layout = layoutCss({ ...badge, rotationLigneBas180: false }).replace(/@page[^}]*}/g, '');
  const css = scopeCss(`${baseCss(theme)}${layout}${EDITOR_CSS}`, scope);

  return { css, html: `<div class="sheet">${sheetHtml}</div>` };
}

/**
 * Renders the full badge HTML document for one participant. `assets` must
 * already be resolved (data URIs on the server, authenticated /api/images/:id
 * URLs on the client) — this function never fetches anything itself, so the
 * same code runs in both places. Dynamic text is emitted raw (see
 * elements/texte.js) — call fitDynamicTextInDom() against the resulting
 * document before treating it as final output.
 */
export function renderBadgeHtml({ badge, theme, participant, event, organisme, organisateur, categorie, assets, measureTextWidthMm, showSafeZone, timezone, numero, dateImpression }) {
  const ctx = buildCtx({ theme, participant, event, organisme, organisateur, categorie, assets, measureTextWidthMm, timezone, numero, dateImpression });

  const panels = ['P1', 'P2', 'P3', 'P4'].map((key) =>
    renderPanel(key, badge.elements, ctx, showSafeZone, badge.safeZoneMm ?? SAFE_ZONE_DEFAULT_MM, activePanelKeys(badge)),
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

  const sheets = entries.map(({ participant, event, organisme, organisateur, categorie, assets, timezone, numero, dateImpression }) => {
    const ctx = buildCtx({ theme, participant, event, organisme, organisateur, categorie, assets, timezone, numero, dateImpression });
    const panels = ['P1', 'P2', 'P3', 'P4'].map((key) => renderPanel(key, badge.elements, ctx, false, badge.safeZoneMm ?? SAFE_ZONE_DEFAULT_MM, activePanelKeys(badge)));
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

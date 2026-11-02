import './blocks/participant.js';
import './blocks/evenement.js';
import './blocks/contenu.js';
import { getBlockDefinition, hasBlockType } from './registry.js';
import { blockStyleToCss } from './blockStyle.js';

export { registerBlock, getBlockDefinition, hasBlockType, listBlockTypes, getDefaultProps } from './registry.js';
export { esc, renderRichText, isValidHexColor, isValidHttpUrl } from './escape.js';
export { nanoid } from './nanoid.js';
export { BUILTIN_TEMPLATES } from './templates.js';

const FONT_STACKS = {
  titres: "'Montserrat', 'Segoe UI', Arial, sans-serif",
  texte: "'Open Sans', 'Segoe UI', Arial, sans-serif",
  nom: "'Merriweather', Georgia, 'Times New Roman', serif",
  arabe: "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Segoe UI', sans-serif",
};

function panelSizeMm(badgeConfig) {
  if (badgeConfig.format === 'A6') return { width: 105, height: 148.5 };
  if (badgeConfig.format === 'CARTE') {
    return { width: badgeConfig.carteLargeurMm || 85.6, height: badgeConfig.carteHauteurMm || 54 };
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
    .panel { position: relative; overflow: hidden; padding: 5mm; display: flex; flex-direction: column; }
    .bloc-pill {
      display: inline-block; font-family: ${policeTitres}; font-weight: 700; font-size: 3mm;
      text-transform: uppercase; background: ${theme.couleurSecondaire};
      border: 0.4mm solid ${theme.couleurPrincipale}; border-radius: 10mm;
      padding: 1.2mm 4mm; align-self: flex-start;
    }
    .bloc-entete { padding: 3mm; border-radius: 2mm; }
    .bloc-entete--image { padding: 0; }
    .bloc-entete--image img { width: 100%; display: block; }
    .bloc-entete-patronage { text-align: center; font-size: 2.2mm; margin-bottom: 1.5mm; }
    .bloc-entete-patronage-ar { font-family: ${FONT_STACKS.arabe}; font-size: 2.6mm; }
    .bloc-entete-row { display: flex; align-items: center; gap: 2mm; }
    .bloc-entete-logo { height: 10mm; object-fit: contain; }
    .bloc-entete-titres { flex: 1; }
    .bloc-entete-titre { font-family: ${policeTitres}; font-weight: 700; font-size: 3.4mm; }
    .bloc-entete-par-ligne, .bloc-entete-edition, .bloc-entete-dates { font-size: 2.4mm; }
    .bloc-entete-descriptif { font-size: 2mm; margin-top: 1mm; color: #555; }
    .bloc-nom-prenom { font-family: ${policeNom}; font-weight: 700; font-size: 5.5mm; line-height: 1.1; text-align: center; }
    .bloc-fonction { font-size: 3mm; text-align: center; }
    .bloc-organisme { text-align: center; }
    .bloc-organisme-nom { font-size: 3mm; text-transform: uppercase; font-weight: 700; color: ${theme.couleurAccent}; }
    .bloc-organisme-logo { max-height: 8mm; max-width: 100%; object-fit: contain; }
    .bloc-photo { width: 18mm; height: 18mm; overflow: hidden; margin: 0 auto; }
    .bloc-photo--rond { border-radius: 50%; }
    .bloc-photo img { width: 100%; height: 100%; object-fit: cover; }
    .bloc-qr { margin: 0 auto; }
    .bloc-qr svg { width: 100%; height: 100%; }
    .bloc-bande-categorie { display: flex; align-items: center; justify-content: center; padding: 1.5mm; margin: 0 -5mm; }
    .bloc-bande-categorie span { color: #fff; font-family: ${policeTitres}; font-weight: 700; font-size: 3.2mm; text-transform: uppercase; }
    .bloc-champ-participant { font-size: 2.6mm; text-align: center; }
    .bloc-texte { font-size: 2.6mm; }
    .bloc-liste-infos { border-left: 1mm solid ${theme.couleurPrincipale}; padding-left: 3mm; display: flex; flex-direction: column; gap: 2mm; font-size: 2.6mm; }
    .bloc-liste-infos-intro { font-style: italic; }
    .bloc-liste-infos-row { display: flex; gap: 2mm; align-items: flex-start; }
    .bloc-liste-infos-icon { font-size: 3.4mm; }
    .bloc-horaires { font-size: 2.6mm; }
    .bloc-encadre { border-radius: 2mm; padding: 2mm; font-size: 2.4mm; }
    .bloc-encadre--contour { border: 0.3mm dashed; }
    .bloc-encadre--plein { background: ${theme.couleurSecondaire}; }
    .bloc-image img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; margin: 0 auto; }
    .bloc-entete-compact { display: flex; align-items: center; gap: 2mm; }
    .bloc-entete-compact-logo { height: 8mm; object-fit: contain; }
    .bloc-entete-compact-liens { font-size: 2.2mm; }
    .bloc-logo-organisateur--S img { max-height: 6mm; }
    .bloc-logo-organisateur--M img { max-height: 10mm; }
    .bloc-logo-organisateur--L img { max-height: 14mm; }
    .bloc-logo-organisateur--XL img { max-height: 20mm; }
    .bloc-logo-organisateur { text-align: center; }
    .bloc-logo-organisateur img { max-width: 100%; object-fit: contain; }
    .bloc-logos-grid { display: flex; flex-direction: column; gap: 2mm; }
    .bloc-logos-row { display: flex; justify-content: center; gap: 2mm; }
    .bloc-logos-grid--cols-2 .bloc-logo-cell { width: calc(50% - 1mm); }
    .bloc-logos-grid--cols-3 .bloc-logo-cell { width: calc(33.333% - 1.4mm); }
    .bloc-logos-grid--cols-4 .bloc-logo-cell { width: calc(25% - 1.5mm); }
    .bloc-logo-cell { display: flex; align-items: center; justify-content: center; height: 12mm; flex-grow: 0; flex-shrink: 0; }
    .bloc-logo-cell img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .bloc-encart-promo { margin-top: auto; border-radius: 2mm; padding: 3mm; color: #fff; position: relative; }
    .bloc-promo-pastille {
      position: absolute; top: -3mm; right: 2mm; background: #fff; color: inherit;
      border-radius: 50%; width: 10mm; height: 10mm; display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 2.6mm;
    }
    .bloc-promo-titre { font-family: ${policeTitres}; font-weight: 700; font-size: 3mm; }
    .bloc-promo-texte { font-size: 2.4mm; margin-top: 1mm; }
    .bloc-promo-logo { max-height: 8mm; margin-top: 1.5mm; }
    .bloc-site-reseaux { font-size: 2.2mm; }
    .bloc-separateur-ligne { border: none; border-top: 0.2mm solid; margin: 2mm 0; }
    .bloc-separateur-espace { height: 4mm; }
  `;
}

function layoutCss(badgeConfig) {
  if (badgeConfig.format !== 'A4_PLIE_4') {
    const { width, height } = panelSizeMm(badgeConfig);
    return `
      @page { size: ${width}mm ${height}mm; margin: 0; }
      body { width: ${width}mm; height: ${height}mm; }
      .sheet { width: ${width}mm; height: ${height}mm; }
      .panel-P2, .panel-P3, .panel-P4 { display: none; }
    `;
  }

  const rotation = badgeConfig.rotationLigneBas180
    ? '.panel-P2, .panel-P4 { transform: rotate(180deg); }'
    : '';
  const foldLines =
    badgeConfig.traitsDePliage !== false
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
    ${foldLines}
    ${rotation}
  `;
}

function renderBlock(bloc, ctx) {
  if (!hasBlockType(bloc.type)) return '';
  const def = getBlockDefinition(bloc.type);
  const validated = def.validateProps(bloc.props || {});
  if (!validated.valid) return '';
  const inner = def.render({ props: validated.value, ctx });
  if (!inner) return '';
  const style = blockStyleToCss(bloc.style, ctx.theme);
  return `<div class="bloc" data-bloc-id="${bloc.id || ''}" data-bloc-type="${bloc.type}" style="${style}">${inner}</div>`;
}

function renderPanel(panelKey, panneau, ctx) {
  if (!panneau?.actif && panelKey !== 'P1') {
    return `<section class="panel panel-${panelKey}"></section>`;
  }
  const blocsHtml = (panneau?.blocs || []).map((bloc) => renderBlock(bloc, ctx)).join('');
  return `<section class="panel panel-${panelKey}">${blocsHtml}</section>`;
}

function singlePanelLayoutCss(config) {
  const { width, height } = panelSizeMm(config);
  return `
    @page { size: ${width}mm ${height}mm; margin: 0; }
    body { width: ${width}mm; height: ${height}mm; }
    .sheet { width: ${width}mm; height: ${height}mm; }
    .sheet .panel { width: ${width}mm; height: ${height}mm; }
  `;
}

/**
 * Renders exactly one panel's HTML, always sized to that single panel
 * (quarter-A4 / 105x148.5mm for A4_PLIE_4, or the format's own size for a
 * standalone P1) regardless of the overall multi-panel format. Used by the
 * builder's per-panel canvas view (Addendum 3 §3), where each of P1-P4 is
 * shown as its own editable box rather than one full A4 sheet.
 */
export function renderSinglePanelHtml({ panelKey, config, theme, participant, event, organisme, organisateur, categorie, assets }) {
  const ctx = { participant, event, organisme, organisateur, categorie, theme, assets: assets || {} };
  const panelHtml = renderPanel(panelKey, config.panneaux?.[panelKey], ctx);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>${baseCss(theme)}${singlePanelLayoutCss(config)}</style>
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
 * same code runs in both places (§4.1 of the addendum).
 */
export function renderBadgeHtml({ config, theme, participant, event, organisme, organisateur, categorie, assets }) {
  const ctx = {
    participant,
    event,
    organisme,
    organisateur,
    categorie,
    theme,
    assets: assets || {},
  };

  const panels = ['P1', 'P2', 'P3', 'P4'].map((key) => renderPanel(key, config.panneaux?.[key], ctx));
  const sheetHtml = config.format === 'A4_PLIE_4' ? panels.join('') : panels[0];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>${baseCss(theme)}${layoutCss(config)}</style>
</head>
<body>
  <div class="sheet">${sheetHtml}</div>
</body>
</html>`;
}

/**
 * Renders one HTML document containing every participant's sheet, each on
 * its own printed page, sharing a single <style> block (always the same
 * event/config across a batch).
 */
export function renderBatchBadgeHtml(entries) {
  if (entries.length === 0) return '<!DOCTYPE html><html><body></body></html>';
  const { config, theme } = entries[0];

  const sheets = entries.map(({ participant, event, organisme, organisateur, categorie, assets }) => {
    const ctx = { participant, event, organisme, organisateur, categorie, theme, assets: assets || {} };
    const panels = ['P1', 'P2', 'P3', 'P4'].map((key) => renderPanel(key, config.panneaux?.[key], ctx));
    return config.format === 'A4_PLIE_4' ? panels.join('') : panels[0];
  });

  const pages = sheets
    .map((sheet, i) => `<div${i > 0 ? ' style="page-break-before: always;"' : ''}><div class="sheet">${sheet}</div></div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>${baseCss(theme)}${layoutCss(config)}</style>
</head>
<body>${pages}</body>
</html>`;
}

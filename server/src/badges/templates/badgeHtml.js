import { generateQrCodeSvg } from '../../services/qrService.js';

const FONT_STACKS = {
  titres: "'Montserrat', 'Segoe UI', Arial, sans-serif",
  texte: "'Open Sans', 'Segoe UI', Arial, sans-serif",
  nom: "'Merriweather', Georgia, 'Times New Roman', serif",
  arabe: "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Segoe UI', sans-serif",
};

function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imageDataUri(buffer, mimeType) {
  if (!buffer) return null;
  return `data:${mimeType || 'image/webp'};base64,${buffer.toString('base64')}`;
}

/**
 * Renders an <img> tag, or nothing at all if there is no source — callers
 * must never leave empty space for a missing optional image (spec §2.2).
 */
function imgOrEmpty(src, { className = '', alt = '' } = {}) {
  if (!src) return '';
  return `<img class="${className}" src="${src}" alt="${esc(alt)}" />`;
}

function pill(title) {
  if (!title) return '';
  return `<div class="pill">${esc(title)}</div>`;
}

function panelHeader(badgeConfig, images) {
  const entete = badgeConfig.entete || {};
  if (entete.modeImage && images.banniere) {
    return `<div class="entete entete--image">${imgOrEmpty(images.banniere, { className: 'entete-banniere', alt: 'Bannière' })}</div>`;
  }

  const patronage = entete.patronageAr || entete.patronageFr
    ? `<div class="patronage">
        ${entete.patronageAr ? `<div dir="rtl" lang="ar" class="patronage-ar">${esc(entete.patronageAr)}</div>` : ''}
        ${entete.patronageFr ? `<div class="patronage-fr">${esc(entete.patronageFr)}</div>` : ''}
      </div>`
    : '';

  return `
    <div class="entete">
      ${patronage}
      <div class="entete-row">
        ${imgOrEmpty(images.logoEvenement, { className: 'entete-logo', alt: 'Logo événement' })}
        <div class="entete-titres">
          <div class="entete-titre">${esc(entete.titreAffiche)}</div>
          ${entete.sousTitreParLigne ? `<div class="entete-sous-titre">${esc(entete.sousTitreParLigne)}</div>` : ''}
          ${entete.edition ? `<div class="entete-edition">${esc(entete.edition)}</div>` : ''}
        </div>
      </div>
      ${entete.descriptif ? `<div class="entete-descriptif">${esc(entete.descriptif)}</div>` : ''}
    </div>`;
}

function panel1(ctx) {
  const { participant, categorie, organisme, badgeConfig, images, qrSvg, afficherPhoto } = ctx;
  const nomComplet = `${participant.prenom || ''} ${participant.nom || ''}`.trim().toUpperCase();
  const categorieColor = categorie?.couleur || badgeConfig.theme?.couleurPrincipale || '#1971c2';

  return `
    <section class="panel panel-1">
      ${panelHeader(badgeConfig, images)}
      <div class="panel1-body">
        ${afficherPhoto && images.photo ? `<div class="photo-wrap">${imgOrEmpty(images.photo, { className: 'photo', alt: 'Photo' })}</div>` : ''}
        <div class="nom">${esc(nomComplet)}</div>
        ${participant.fonction ? `<div class="fonction">${esc(participant.fonction)}</div>` : ''}
        ${organisme?.nom ? `<div class="organisme">${esc(organisme.nom)}</div>` : ''}
        <div class="qr">${qrSvg}</div>
      </div>
      <div class="categorie-band" style="background:${esc(categorieColor)}">
        <span>${esc(categorie?.nom || '')}</span>
      </div>
    </section>`;
}

function iconRow(icon, label, value) {
  if (!value) return '';
  return `<div class="info-row"><span class="info-icon">${icon}</span><div><strong>${esc(label)}</strong><div>${esc(value)}</div></div></div>`;
}

function formatDateRange(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) return '';
  const opts = { day: 'numeric', month: 'long', year: 'numeric' };
  const d1 = new Date(dateDebut).toLocaleDateString('fr-FR', opts);
  const d2 = new Date(dateFin).toLocaleDateString('fr-FR', opts);
  return d1 === d2 ? d1 : `${d1} - ${d2}`;
}

function panel2(ctx) {
  const { event, badgeConfig, images } = ctx;
  const info = badgeConfig.infosPratiques || {};
  const horairesHtml = (info.horaires || [])
    .map((h) => `<div>${esc(h.libelleJours)}${h.ouverture ? ` : ${esc(h.ouverture)} - ${esc(h.fermeture)}` : ''}</div>`)
    .join('');

  return `
    <section class="panel panel-2">
      ${pill('INFORMATIONS PRATIQUES')}
      <div class="info-box">
        ${info.messageValidite ? `<p class="info-intro">${esc(info.messageValidite)}</p>` : ''}
        ${iconRow('📅', 'Dates du salon', formatDateRange(event.dateDebut, event.dateFin))}
        ${horairesHtml ? `<div class="info-row"><span class="info-icon">🕐</span><div><strong>Horaires d'ouverture</strong>${horairesHtml}</div></div>` : ''}
        ${iconRow('📍', 'Lieu', [info.lieuNom || event.lieu, info.lieuDetail].filter(Boolean).join(' — '))}
        ${iconRow('📋', "Droits d'entrée", info.droitsEntree)}
        ${iconRow('➡️', 'Venir au salon', info.venirAuSalon)}
        ${
          info.noteEncadree?.texte
            ? `<div class="note-encadree">${esc(info.noteEncadree.texte)}${info.noteEncadree.lien ? ` <span class="lien">${esc(info.noteEncadree.lien)}</span>` : ''}</div>`
            : ''
        }
      </div>
      ${
        info.afficherOrganisateur !== false && images.logoOrganisateur
          ? `${pill('ORGANISATEUR')}<div class="organisateur-logo">${imgOrEmpty(images.logoOrganisateur, { className: 'logo-organisateur', alt: 'Organisateur' })}</div>`
          : ''
      }
    </section>`;
}

function logoSizeClass(taille) {
  if (taille === 'S') return 'logos-s';
  if (taille === 'L') return 'logos-l';
  return 'logos-m';
}

function perRowCount(taille) {
  if (taille === 'S') return 4;
  if (taille === 'L') return 2;
  return 3;
}

function chunk(array, size) {
  const rows = [];
  for (let i = 0; i < array.length; i += size) {
    rows.push(array.slice(i, i + size));
  }
  return rows;
}

/**
 * Flexbox's justify-content centers a wrapped multi-line container as one
 * block, not each wrapped line independently — a plain flex/grid with
 * flex-wrap leaves a partial last row (e.g. 2 logos left over from 5) stuck
 * against the block's edge instead of centered on its own. Rendering each
 * row of logos as its own centered flex container avoids that entirely.
 */
function groupeHtml(groupe, partenaireImageMap) {
  const sources = (groupe.partenaires || [])
    .map((p) => partenaireImageMap.get(String(p.partenaireId)))
    .filter(Boolean);
  if (sources.length === 0) return '';

  const sizeClass = logoSizeClass(groupe.tailleLogos);
  const rows = chunk(sources, perRowCount(groupe.tailleLogos));
  const rowsHtml = rows
    .map(
      (row) =>
        `<div class="logos-row">${row
          .map((src) => `<div class="logo-cell">${imgOrEmpty(src, { className: 'logo-partenaire' })}</div>`)
          .join('')}</div>`,
    )
    .join('');

  return `
    <div class="groupe-partenaires">
      ${pill(groupe.titre)}
      <div class="logos-grid ${sizeClass}">${rowsHtml}</div>
    </div>`;
}

function panel3(ctx) {
  const { event, badgeConfig, images, groupesP3, partenaireImageMap } = ctx;
  const groupesHtml = groupesP3.map((g) => groupeHtml(g, partenaireImageMap)).join('');

  return `
    <section class="panel panel-3">
      <div class="entete-compact">
        ${imgOrEmpty(images.logoEvenement, { className: 'entete-logo-sm', alt: 'Logo' })}
        <div class="entete-compact-liens">
          ${badgeConfig.siteWeb ? `<div>${esc(badgeConfig.siteWeb)}</div>` : ''}
        </div>
      </div>
      ${groupesHtml}
    </section>`;
}

function panel4(ctx) {
  const { badgeConfig, groupesP4, partenaireImageMap, encartPromoLogo } = ctx;
  const groupesHtml = groupesP4.map((g) => groupeHtml(g, partenaireImageMap)).join('');
  const promo = badgeConfig.encartPromo;

  const promoHtml =
    promo?.actif && promo?.titre
      ? `<div class="encart-promo" style="background:${esc(promo.couleur || '#e8732c')}">
          ${promo.pastille ? `<div class="promo-pastille">${esc(promo.pastille)}</div>` : ''}
          <div class="promo-titre">${esc(promo.titre)}</div>
          ${promo.texte ? `<div class="promo-texte">${esc(promo.texte)}</div>` : ''}
          ${imgOrEmpty(encartPromoLogo, { className: 'promo-logo' })}
        </div>`
      : '';

  return `
    <section class="panel panel-4">
      ${groupesHtml}
      ${promoHtml}
    </section>`;
}

function panelSizeMm(badgeConfig) {
  if (badgeConfig.format === 'A6') {
    return { width: 105, height: 148.5 };
  }
  if (badgeConfig.format === 'CARTE') {
    return { width: badgeConfig.carteLargeurMm || 85.6, height: badgeConfig.carteHauteurMm || 54 };
  }
  return { width: 105, height: 148.5 };
}

function baseCss(badgeConfig) {
  const theme = badgeConfig.theme || {};
  const policeTitres = theme.policeTitres ? `'${theme.policeTitres}', ${FONT_STACKS.titres}` : FONT_STACKS.titres;
  const policeTexte = theme.policeTexte ? `'${theme.policeTexte}', ${FONT_STACKS.texte}` : FONT_STACKS.texte;
  const policeNom = theme.policeNom ? `'${theme.policeNom}', ${FONT_STACKS.nom}` : FONT_STACKS.nom;

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${policeTexte}; color: ${theme.couleurTexte || '#1f2a1f'}; }
    .panel { position: relative; overflow: hidden; padding: 5mm; display: flex; flex-direction: column; }
    .pill {
      display: inline-block; font-family: ${policeTitres}; font-weight: 700; font-size: 3mm;
      text-transform: uppercase; background: ${theme.couleurSecondaire || '#dceefe'};
      border: 0.4mm solid ${theme.couleurPrincipale || '#1971c2'}; border-radius: 10mm;
      padding: 1.2mm 4mm; margin-top: 2mm; margin-bottom: 3mm; align-self: flex-start;
    }
    .entete {
      background: ${theme.degradeEntete !== false
        ? `linear-gradient(135deg, ${theme.couleurSecondaire || '#dceefe'}, #ffffff)`
        : theme.couleurSecondaire || '#dceefe'};
      padding: 3mm; border-radius: 2mm; margin-bottom: 2mm;
    }
    .entete--image { padding: 0; }
    .entete-banniere { width: 100%; display: block; }
    .patronage { text-align: center; font-size: 2.2mm; margin-bottom: 1.5mm; }
    .patronage-ar { font-family: ${FONT_STACKS.arabe}; font-size: 2.6mm; }
    .entete-row { display: flex; align-items: center; gap: 2mm; }
    .entete-logo { height: 10mm; object-fit: contain; }
    .entete-titres { flex: 1; }
    .entete-titre { font-family: ${policeTitres}; font-weight: 700; font-size: 3.4mm; }
    .entete-sous-titre, .entete-edition { font-size: 2.4mm; }
    .entete-descriptif { font-size: 2mm; margin-top: 1mm; color: #555; }
    .panel1-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1.5mm; }
    .photo-wrap { width: 18mm; height: 18mm; border-radius: 50%; overflow: hidden; }
    .photo { width: 100%; height: 100%; object-fit: cover; }
    .nom { font-family: ${policeNom}; font-weight: 700; font-size: 5.5mm; line-height: 1.1; }
    .fonction { font-size: 3mm; }
    .organisme { font-size: 3mm; text-transform: uppercase; font-weight: 700; color: ${theme.couleurAccent || '#e3a72f'}; }
    .qr svg { width: 22mm; height: 22mm; }
    .categorie-band { display: flex; align-items: center; justify-content: center; padding: 1.5mm; margin: 0 -5mm -5mm; }
    .categorie-band span { color: #fff; font-family: ${policeTitres}; font-weight: 700; font-size: 3.2mm; text-transform: uppercase; }
    .info-box { border-left: 1mm solid ${theme.couleurPrincipale || '#1971c2'}; padding-left: 3mm; display: flex; flex-direction: column; gap: 2mm; font-size: 2.6mm; }
    .info-intro { font-style: italic; }
    .info-row { display: flex; gap: 2mm; align-items: flex-start; }
    .info-icon { font-size: 3.4mm; }
    .note-encadree { border: 0.3mm dashed ${theme.couleurPrincipale || '#1971c2'}; border-radius: 2mm; padding: 2mm; font-size: 2.4mm; }
    .note-encadree .lien { color: ${theme.couleurPrincipale || '#1971c2'}; font-weight: 700; }
    .organisateur-logo { text-align: center; }
    .logo-organisateur { max-height: 10mm; max-width: 100%; object-fit: contain; }
    .entete-compact { display: flex; align-items: center; gap: 2mm; margin-bottom: 2mm; }
    .entete-logo-sm { height: 8mm; object-fit: contain; }
    .entete-compact-liens { font-size: 2.2mm; }
    .groupe-partenaires { margin-bottom: 4mm; }
    .logos-grid { display: flex; flex-direction: column; gap: 2mm; }
    .logos-row { display: flex; justify-content: center; gap: 2mm; }
    .logos-grid.logos-s .logo-cell { width: calc(25% - 1.5mm); }
    .logos-grid.logos-m .logo-cell { width: calc(33.333% - 1.4mm); }
    .logos-grid.logos-l .logo-cell { width: calc(50% - 1mm); }
    .logo-cell { display: flex; align-items: center; justify-content: center; height: 12mm; flex-grow: 0; flex-shrink: 0; }
    .logo-partenaire { max-width: 100%; max-height: 100%; object-fit: contain; }
    .encart-promo { margin-top: auto; border-radius: 2mm; padding: 3mm; color: #fff; position: relative; }
    .promo-pastille {
      position: absolute; top: -3mm; right: 2mm; background: #fff; color: inherit;
      border-radius: 50%; width: 10mm; height: 10mm; display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 2.6mm;
    }
    .promo-titre { font-family: ${policeTitres}; font-weight: 700; font-size: 3mm; }
    .promo-texte { font-size: 2.4mm; margin-top: 1mm; }
    .promo-logo { max-height: 8mm; margin-top: 1.5mm; }
  `;
}

/**
 * A4_PLIE_4: 4 panels on one A4 sheet, 2x2 grid, each panel sized to A6
 * (105 x 148.5mm) which exactly quarters an A4 (210 x 297mm) page.
 */
function layoutCss(badgeConfig) {
  if (badgeConfig.format !== 'A4_PLIE_4') {
    const { width, height } = panelSizeMm(badgeConfig);
    return `
      @page { size: ${width}mm ${height}mm; margin: 0; }
      body { width: ${width}mm; height: ${height}mm; }
      .sheet { width: ${width}mm; height: ${height}mm; }
      .panel-2, .panel-3, .panel-4 { display: none; }
    `;
  }

  const rotation = badgeConfig.rotationLigneBas180
    ? '.panel-2, .panel-4 { transform: rotate(180deg); }'
    : '';
  const foldLines = badgeConfig.traitsDePliage !== false
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

/**
 * Builds just the <div class="sheet">...</div> fragment for one
 * participant's badge, with no surrounding <html>/<style>. Used directly by
 * buildBadgeHtml (single badge) and reused as-is across many participants
 * by buildBatchBadgeHtml (same event => same styles, only the sheet differs).
 */
async function buildSheetHtml({ participant, event, categorie, organisme, organisateur, images, partenaires }) {
  const badgeConfig = event.badgeConfig || {};
  const qrSvg = await generateQrCodeSvg(participant.badgeCode || '');

  const partenaireImageMap = new Map((partenaires || []).map((p) => [String(p._id), p.logoDataUri]));

  const allGroupes = badgeConfig.groupesPartenaires || [];
  const panneauxActifs = badgeConfig.panneauxActifs || {};
  const groupesP3 = allGroupes.filter((g) => g.panneau === 'P3' || g.panneau === 'AUTO').sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  const groupesP4 = allGroupes.filter((g) => g.panneau === 'P4').sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  const ctx = {
    participant,
    event,
    categorie,
    organisme,
    organisateur,
    badgeConfig,
    images,
    qrSvg,
    afficherPhoto: badgeConfig.afficherPhoto,
    groupesP3,
    groupesP4,
    partenaireImageMap,
    encartPromoLogo: badgeConfig.encartPromo?.partenaireId
      ? partenaireImageMap.get(String(badgeConfig.encartPromo.partenaireId))
      : null,
  };

  const panels = [panel1(ctx)];
  if (badgeConfig.format === 'A4_PLIE_4') {
    if (panneauxActifs.p2 !== false) panels.push(panel2(ctx)); else panels.push('<section class="panel panel-2"></section>');
    if (panneauxActifs.p3 !== false) panels.push(panel3(ctx)); else panels.push('<section class="panel panel-3"></section>');
    if (panneauxActifs.p4 !== false) panels.push(panel4(ctx)); else panels.push('<section class="panel panel-4"></section>');
  }

  return `<div class="sheet">${panels.join('')}</div>`;
}

function buildStyles(badgeConfig) {
  return `${baseCss(badgeConfig)}${layoutCss(badgeConfig)}`;
}

/**
 * Builds the full HTML document for one participant's badge. Used both for
 * Puppeteer PDF rendering and the (future) live preview iframe, so what the
 * user sees in the back-office is exactly what gets printed.
 */
export async function buildBadgeHtml(args) {
  const badgeConfig = args.event.badgeConfig || {};
  const sheet = await buildSheetHtml(args);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>${buildStyles(badgeConfig)}</style>
</head>
<body>
  ${sheet}
</body>
</html>`;
}

/**
 * Builds one HTML document containing every participant's badge sheet, each
 * on its own printed page (page-break-before), sharing one <style> block
 * since a batch is always for a single event/badgeConfig.
 */
export async function buildBatchBadgeHtml(entries) {
  const badgeConfig = entries[0]?.event.badgeConfig || {};
  const sheets = await Promise.all(entries.map((entry) => buildSheetHtml(entry)));
  const pages = sheets
    .map((sheet, i) => `<div${i > 0 ? ' style="page-break-before: always;"' : ''}>${sheet}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>${buildStyles(badgeConfig)}</style>
</head>
<body>
  ${pages}
</body>
</html>`;
}

export { imageDataUri };

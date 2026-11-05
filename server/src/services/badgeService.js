import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { getImageWithData } from './imageService.js';
import { Partenaire } from '../models/Partenaire.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Organisateur } from '../models/Organisateur.js';
import { generateQrCodeSvg } from './qrService.js';
import { renderBadgeHtml, renderBatchBadgeHtml } from '../../../shared/badge-renderer/index.js';

const BROWSER_FIT_SCRIPT_PATH = fileURLToPath(
  new URL('../../../shared/badge-renderer/browserFit.js', import.meta.url),
);

let browserPromise = null;
let browserFitScriptPromise = null;

/**
 * Locally Puppeteer's own Chrome. On Vercel (serverless functions can't
 * ship that Chrome) the slim @sparticuz/chromium build, loaded only there.
 */
async function launchBrowser() {
  if (process.env.VERCEL) {
    const { default: chromium } = await import('@sparticuz/chromium');
    return puppeteer.launch({
      headless: true,
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      defaultViewport: null,
    });
  }
  return puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
    browserPromise.catch(() => {
      browserPromise = null;
    });
    browserPromise.then((browser) => {
      browser.on('disconnected', () => {
        browserPromise = null;
      });
    });
  }
  return browserPromise;
}

function getBrowserFitScript() {
  if (!browserFitScriptPromise) {
    browserFitScriptPromise = fs.readFile(BROWSER_FIT_SCRIPT_PATH, 'utf8');
  }
  return browserFitScriptPromise;
}

async function loadImageDataUri(imageId) {
  if (!imageId) return null;
  const image = await getImageWithData(imageId);
  if (!image?.data) return null;
  return `data:${image.mimeType};base64,${image.data.toString('base64')}`;
}

/**
 * Resolves every image an element references (free images, partner logos,
 * logos, photo) to a data URI — Puppeteer has no session, so it can't fetch
 * the authenticated /api/images/:id route itself.
 */
async function buildAssets({ badge, organisateur, participant, organisme }) {
  const elements = badge?.elements || [];

  const freeImageIds = elements.filter((el) => el.type === 'image' && el.props?.imageId).map((el) => String(el.props.imageId));

  const partenaireIds = new Set();
  elements
    .filter((el) => el.type === 'grillePartenaires')
    .forEach((el) => (el.props?.partenaires || []).forEach((p) => p.partenaireId && partenaireIds.add(String(p.partenaireId))));

  const uses = (type) => elements.some((el) => el.type === type);

  const [organisateurLogo, organismeLogo, participantPhoto, freeImageEntries, partenaireEntries] = await Promise.all([
    uses('logoOrganisateur') ? loadImageDataUri(organisateur?.logoImageId) : null,
    uses('logoOrganisme') ? loadImageDataUri(organisme?.logoImageId) : null,
    uses('photo') ? loadImageDataUri(participant?.photoImageId) : null,
    Promise.all(freeImageIds.map(async (id) => [id, await loadImageDataUri(id)])),
    (async () => {
      if (partenaireIds.size === 0) return [];
      const partenaires = await Partenaire.find({ _id: { $in: [...partenaireIds] } });
      return Promise.all(partenaires.map(async (p) => [String(p._id), await loadImageDataUri(p.logoImageId)]));
    })(),
  ]);

  return {
    organisateurLogo,
    organismeLogo,
    participantPhoto,
    freeImages: Object.fromEntries(freeImageEntries),
    partenaireLogos: Object.fromEntries(partenaireEntries),
  };
}

async function hydrateEntry({ participant, event, categorie, organisme, organisateur }) {
  const badge = event.badge;
  const [assets, qrCodeSvg] = await Promise.all([
    buildAssets({ badge, organisateur, participant, organisme }),
    generateQrCodeSvg(participant.badgeCode || ''),
  ]);
  assets.qrCodeSvg = qrCodeSvg;

  return { badge, theme: badge.theme || {}, participant, event, organisme, organisateur, categorie, assets };
}

/**
 * Loads the HTML in a page and runs the shared browser-side text fitting
 * (browserFit.js) — the same algorithm the editor runs in its iframe — so
 * dynamic text in the PDF is shrunk/wrapped/truncated against real fonts.
 */
async function withFittedPage(html, fn) {
  const [browser, fitScript] = await Promise.all([getBrowser(), getBrowserFitScript()]);
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ content: fitScript });
    const fitReport = await page.evaluate(() => window.__badgeRendererFit());
    return await fn(page, fitReport);
  } finally {
    await page.close();
  }
}

// page.pdf() resolves to a Uint8Array: wrap it in a Buffer so every
// res.send() treats it as binary (Vercel's response helpers JSON-encode
// anything that isn't a Buffer).
function renderPdf(html) {
  return withFittedPage(html, async (page) => Buffer.from(await page.pdf({ printBackground: true, preferCSSPageSize: true })));
}

export async function generateSingleBadgePdf(args) {
  const hydrated = await hydrateEntry(args);
  return renderPdf(renderBadgeHtml(hydrated));
}

/**
 * HTML preview for the back-office. Returned un-fitted, with the fitting
 * script inlined so the browser opening it performs the same fitting pass.
 */
export async function generateBadgeHtmlPreview(args) {
  const hydrated = await hydrateEntry(args);
  const html = renderBadgeHtml(hydrated);
  const fitScript = await getBrowserFitScript();
  const bootstrap = `<script>${fitScript}</script><script>document.fonts.ready.then(function(){window.__badgeRendererFit();});</script>`;
  return html.replace('</body>', `${bootstrap}</body>`);
}

/** { participant, event, categorie, organisme, organisateur } for each participant (badge rendering input). */
export async function loadBadgeEntries(event, participants) {
  const categorieIds = [...new Set(participants.map((p) => p.categorieId?.toString()).filter(Boolean))];
  const organismeIds = [...new Set(participants.map((p) => p.invitedOrganismId?.toString()).filter(Boolean))];

  const [categories, organismes, organisateur] = await Promise.all([
    CategorieEvent.find({ _id: { $in: categorieIds } }),
    InvitedOrganism.find({ _id: { $in: organismeIds } }),
    Organisateur.findById(event.organisateurId),
  ]);

  const categorieMap = new Map(categories.map((c) => [c._id.toString(), c]));
  const organismeMap = new Map(organismes.map((o) => [o._id.toString(), o]));

  return participants.map((participant) => ({
    participant,
    event,
    categorie: categorieMap.get(participant.categorieId?.toString()),
    organisme: organismeMap.get(participant.invitedOrganismId?.toString()),
    organisateur,
  }));
}

export async function generateBatchBadgesPdf(entries) {
  const hydrated = await Promise.all(entries.map((entry) => hydrateEntry(entry)));
  return renderPdf(renderBatchBadgeHtml(hydrated));
}

export async function closeBadgeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

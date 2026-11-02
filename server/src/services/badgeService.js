import puppeteer from 'puppeteer';
import { getImageWithData } from './imageService.js';
import { Partenaire } from '../models/Partenaire.js';
import { generateQrCodeSvg } from './qrService.js';
import { renderBadgeHtml, renderBatchBadgeHtml } from '../../../shared/badge-renderer/index.js';

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    browserPromise.then((browser) => {
      browser.on('disconnected', () => {
        browserPromise = null;
      });
    });
  }
  return browserPromise;
}

async function loadImageDataUri(imageId) {
  if (!imageId) return null;
  const image = await getImageWithData(imageId);
  if (!image?.data) return null;
  return `data:${image.mimeType};base64,${image.data.toString('base64')}`;
}

function allBlocks(event) {
  const panneaux = event.badgeConfig?.panneaux || {};
  return ['P1', 'P2', 'P3', 'P4'].flatMap((key) => panneaux[key]?.blocs || []);
}

function findBlockProps(event, type) {
  return allBlocks(event).find((b) => b.type === type)?.props;
}

/**
 * Scans every block across all panels for image/partner references (they
 * can live inside any block's props now, not fixed badgeConfig fields) and
 * resolves them all to data URIs for Puppeteer, which has no network
 * access to the authenticated /api/images/:id route.
 */
async function buildAssets({ event, organisateur, participant, organisme }) {
  const entete = findBlockProps(event, 'enteteEvenement');
  const enteteCompact = findBlockProps(event, 'enteteCompact');

  const imageBlockIds = allBlocks(event)
    .filter((b) => b.type === 'image' && b.props?.imageId)
    .map((b) => b.props.imageId);

  const partenaireIds = new Set();
  allBlocks(event).forEach((b) => {
    if (b.type === 'groupePartenaires') {
      (b.props?.partenaires || []).forEach((p) => p.partenaireId && partenaireIds.add(String(p.partenaireId)));
    }
    if (b.type === 'encartPromo' && b.props?.partenaireId) {
      partenaireIds.add(String(b.props.partenaireId));
    }
  });

  const [
    enteteBanniere,
    enteteLogo,
    enteteCompactLogo,
    organisateurLogo,
    organismeLogo,
    participantPhoto,
    blockImageEntries,
    partenaireEntries,
  ] = await Promise.all([
    loadImageDataUri(entete?.banniereImageId),
    loadImageDataUri(entete?.logoImageId),
    loadImageDataUri(enteteCompact?.logoImageId),
    loadImageDataUri(organisateur?.logoImageId),
    loadImageDataUri(organisme?.logoImageId),
    loadImageDataUri(participant.photoImageId),
    Promise.all(imageBlockIds.map(async (id) => [String(id), await loadImageDataUri(id)])),
    (async () => {
      if (partenaireIds.size === 0) return [];
      const partenaires = await Partenaire.find({ _id: { $in: [...partenaireIds] } });
      return Promise.all(
        partenaires.map(async (p) => [String(p._id), await loadImageDataUri(p.logoImageId)]),
      );
    })(),
  ]);

  return {
    enteteBanniere,
    enteteLogo,
    enteteCompactLogo,
    organisateurLogo,
    organismeLogo,
    participantPhoto,
    blockImages: Object.fromEntries(blockImageEntries),
    partenaireLogos: Object.fromEntries(partenaireEntries),
  };
}

async function renderHtmlToPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({ printBackground: true, preferCSSPageSize: true });
  } finally {
    await page.close();
  }
}

async function hydrateEntry({ participant, event, categorie, organisme, organisateur }) {
  const [assets, qrCodeSvg] = await Promise.all([
    buildAssets({ event, organisateur, participant, organisme }),
    generateQrCodeSvg(participant.badgeCode || ''),
  ]);
  assets.qrCodeSvg = qrCodeSvg;

  return {
    config: event.badgeConfig,
    theme: event.badgeConfig.theme,
    participant,
    event,
    organisme,
    organisateur,
    categorie,
    assets,
  };
}

export async function generateSingleBadgePdf({ participant, event, categorie, organisme, organisateur }) {
  const hydrated = await hydrateEntry({ participant, event, categorie, organisme, organisateur });
  const html = renderBadgeHtml(hydrated);
  return renderHtmlToPdf(html);
}

/**
 * Renders the raw HTML for a badge, used by the live-preview endpoint so
 * the back-office iframe shows exactly what the PDF will produce.
 */
export async function generateBadgeHtmlPreview(args) {
  const hydrated = await hydrateEntry(args);
  return renderBadgeHtml(hydrated);
}

export async function generateBatchBadgesPdf(entries) {
  const hydrated = await Promise.all(entries.map((entry) => hydrateEntry(entry)));
  const html = renderBatchBadgeHtml(hydrated);
  return renderHtmlToPdf(html);
}

export async function closeBadgeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

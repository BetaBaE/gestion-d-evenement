import puppeteer from 'puppeteer';
import { getImageWithData } from './imageService.js';
import { Partenaire } from '../models/Partenaire.js';
import { buildBadgeHtml, buildBatchBadgeHtml, imageDataUri } from '../badges/templates/badgeHtml.js';

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
  return imageDataUri(image.data, image.mimeType);
}

async function loadImages(event, organisateur, participant, organisme) {
  const badgeConfig = event.badgeConfig || {};
  const [fond, banniere, logoEvenement, logoOrganisateur, photo, logoOrganisme] = await Promise.all([
    loadImageDataUri(badgeConfig.fondImageId),
    loadImageDataUri(badgeConfig.entete?.banniereImageId),
    loadImageDataUri(badgeConfig.entete?.logoEvenementImageId),
    loadImageDataUri(organisateur?.logoImageId),
    loadImageDataUri(participant.photoImageId),
    loadImageDataUri(organisme?.logoImageId),
  ]);
  return { fond, banniere, logoEvenement, logoOrganisateur, photo, logoOrganisme };
}

async function loadPartenaires(organisateurId, badgeConfig) {
  const ids = new Set();
  (badgeConfig.groupesPartenaires || []).forEach((g) => {
    (g.partenaires || []).forEach((p) => p.partenaireId && ids.add(String(p.partenaireId)));
  });
  if (badgeConfig.encartPromo?.partenaireId) {
    ids.add(String(badgeConfig.encartPromo.partenaireId));
  }
  if (ids.size === 0) return [];

  const partenaires = await Partenaire.find({ _id: { $in: [...ids] }, organisateurId });
  return Promise.all(
    partenaires.map(async (p) => ({
      _id: p._id,
      logoDataUri: await loadImageDataUri(p.logoImageId),
    })),
  );
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
  const [images, partenaires] = await Promise.all([
    loadImages(event, organisateur, participant, organisme),
    loadPartenaires(event.organisateurId, event.badgeConfig || {}),
  ]);
  return { participant, event, categorie, organisme, organisateur, images, partenaires };
}

export async function generateSingleBadgePdf({ participant, event, categorie, organisme, organisateur }) {
  const hydrated = await hydrateEntry({ participant, event, categorie, organisme, organisateur });
  const html = await buildBadgeHtml(hydrated);
  return renderHtmlToPdf(html);
}

/**
 * Renders the raw HTML for a badge, used by the live-preview endpoint so
 * the back-office iframe shows exactly what the PDF will produce.
 */
export async function generateBadgeHtmlPreview(args) {
  const hydrated = await hydrateEntry(args);
  return buildBadgeHtml(hydrated);
}

export async function generateBatchBadgesPdf(entries) {
  const hydrated = await Promise.all(entries.map((entry) => hydrateEntry(entry)));
  const html = await buildBatchBadgeHtml(hydrated);
  return renderHtmlToPdf(html);
}

export async function closeBadgeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

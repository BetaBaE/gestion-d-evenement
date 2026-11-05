/**
 * npm run starters:thumbnails — regenerates the gallery thumbnails of the
 * built-in starter templates (client/public/starters/<key>.png): the front
 * panel (P1) rendered with sample data, through the same renderer and text
 * fitting as the PDFs. Run it after changing a file in
 * shared/badge-renderer/starters.
 */
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { STARTER_TEMPLATES, renderBadgeHtml } from '../../../shared/badge-renderer/index.js';
import { generateQrCodeSvg } from '../services/qrService.js';

const OUT_DIR = fileURLToPath(new URL('../../../client/public/starters/', import.meta.url));
const FIT_SCRIPT = fileURLToPath(new URL('../../../shared/badge-renderer/browserFit.js', import.meta.url));

const SAMPLE = {
  participant: { civilite: 'Mme', nom: 'El Idrissi', prenom: 'Amina', fonction: 'Directrice des opérations' },
  organisme: { nom: "Office National de l'Eau", ville: 'Rabat' },
  categorie: { nom: 'Exposant', couleur: '#1971C2' },
  event: {
    titre: 'Salon International de l’Eau 2026',
    lieu: 'Palais des Congrès',
    adresse: '45 avenue Hassan II',
    ville: 'Rabat',
    dateDebut: '2026-11-18T08:00:00Z',
    dateFin: '2026-11-20T17:00:00Z',
  },
  organisateur: { nom: 'Association des Métiers', telephone: '+212 522 00 00 00', email: 'contact@exemple.ma', siteWeb: 'www.exemple.ma' },
};

await fs.mkdir(OUT_DIR, { recursive: true });
const fit = await fs.readFile(FIT_SCRIPT, 'utf8');
const qrCodeSvg = await generateQrCodeSvg('APERCU-MODELE');
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const starter of Object.values(STARTER_TEMPLATES)) {
    const badge = starter.build();
    const html = renderBadgeHtml({ badge, theme: badge.theme, ...SAMPLE, assets: { qrCodeSvg } });
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1.5 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ content: fit });
    await page.evaluate(() => window.__badgeRendererFit());
    const panel = await page.$('.panel-P1');
    const file = `${OUT_DIR}${starter.key}.png`;
    await panel.screenshot({ path: file });
    await page.close();
    console.log(`${starter.key} → ${file}`);
  }
} finally {
  await browser.close();
}

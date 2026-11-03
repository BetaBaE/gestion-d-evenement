import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ApiError } from '../middlewares/errorHandler.js';

/**
 * "Importer un design": a PDF or image made elsewhere (Canva, Illustrator…)
 * becomes the background of a new template. Nothing is converted into
 * editable elements — the user places the dynamic fields on top.
 */
export const DESIGN_DPI = 300;
const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;
// Ratio differences up to 2 % are treated as a match (export rounding).
export const RATIO_TOLERANCE = 0.02;

const require = createRequire(import.meta.url);
const pdfjsDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
// pdfjs wants URLs with a trailing "/" (Windows paths with "\" are refused).
const PDF_OPTIONS = {
  standardFontDataUrl: `${pathToFileURL(path.join(pdfjsDir, 'standard_fonts')).href}/`,
  cMapUrl: `${pathToFileURL(path.join(pdfjsDir, 'cmaps')).href}/`,
  cMapPacked: true,
  isEvalSupported: false,
  verbosity: 0, // errors only: no font/PostScript warnings in the server logs
};

const mmToPx = (mm) => Math.round((mm / MM_PER_INCH) * DESIGN_DPI);

/** Printed sheet of a format, in mm. */
export function sheetSizeMm({ format, carteLargeurMm, carteHauteurMm }) {
  if (format === 'A4_PLIE_4') return { width: 210, height: 297 };
  if (format === 'A6') return { width: 105, height: 148.5 };
  return { width: carteLargeurMm || 85.6, height: carteHauteurMm || 54 };
}

/** Relative gap between two width/height ratios (0 = identical). */
export function ratioGap(a, b) {
  const ra = a.width / a.height;
  const rb = b.width / b.height;
  return Math.abs(ra - rb) / rb;
}

async function openPdf(buffer) {
  try {
    return await getDocument({ data: new Uint8Array(buffer), ...PDF_OPTIONS }).promise;
  } catch {
    throw new ApiError(400, 'PDF illisible ou protégé par mot de passe.');
  }
}

/** Frees pdfjs resources (the document proxy has no destroy() in pdfjs 6). */
async function closePdf(pdf) {
  await pdf.loadingTask?.destroy();
}

/** Pages of a PDF (size in mm), or the pixel size of an image. */
export async function inspectDesign(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const pdf = await openPdf(buffer);
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n += 1) {
      // eslint-disable-next-line no-await-in-loop
      const page = await pdf.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      pages.push({ numero: n, largeurMm: (width / PT_PER_INCH) * MM_PER_INCH, hauteurMm: (height / PT_PER_INCH) * MM_PER_INCH });
    }
    await closePdf(pdf);
    return { type: 'pdf', pages };
  }
  const meta = await sharp(buffer).metadata().catch(() => null);
  if (!meta?.width) throw new ApiError(400, 'Image illisible.');
  return { type: 'image', largeurPx: meta.width, hauteurPx: meta.height };
}

/** Renders one PDF page to PNG so that `targetWidthPx` is reached (300 dpi of the sheet). */
async function renderPdfPage(buffer, pageNumber, targetWidthPx) {
  const pdf = await openPdf(buffer);
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    await closePdf(pdf);
    throw new ApiError(400, `Ce PDF n'a que ${pdf.numPages} page(s).`);
  }
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.max(targetWidthPx / base.width, DESIGN_DPI / PT_PER_INCH) });
  const { canvas, context } = pdf.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
  // White page behind transparent PDFs.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const png = canvas.toBuffer('image/png');
  await closePdf(pdf);
  return png;
}

/**
 * Turns the uploaded design into one PNG per panel at 300 dpi.
 * `mode`: 'fit' (whole design visible, white margins) or 'crop' (fills the
 * sheet, edges cut). A4 folded in 4 is cut into P1 | P3 / P2 | P4.
 */
export async function buildDesignSlices({ buffer, mimeType, page = 1, badge, mode = 'fit', panels }) {
  const sheet = sheetSizeMm(badge);
  const sheetPx = { width: mmToPx(sheet.width), height: mmToPx(sheet.height) };

  const source = mimeType === 'application/pdf' ? await renderPdfPage(buffer, page, sheetPx.width) : buffer;
  const full = await sharp(source)
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize(sheetPx.width, sheetPx.height, { fit: mode === 'crop' ? 'cover' : 'contain', background: '#ffffff' })
    .png()
    .toBuffer();

  if (badge.format !== 'A4_PLIE_4') {
    return [{ panneau: 'P1', buffer: full, largeurMm: sheet.width, hauteurMm: sheet.height }];
  }
  const half = { width: Math.floor(sheetPx.width / 2), height: Math.floor(sheetPx.height / 2) };
  const quadrants = { P1: [0, 0], P3: [1, 0], P2: [0, 1], P4: [1, 1] };
  const slices = [];
  for (const [panneau, [col, row]] of Object.entries(quadrants)) {
    if (!panels.includes(panneau)) continue;
    // eslint-disable-next-line no-await-in-loop
    const slice = await sharp(full).extract({ left: col * half.width, top: row * half.height, width: half.width, height: half.height }).png().toBuffer();
    slices.push({ panneau, buffer: slice, largeurMm: 105, hauteurMm: 148.5 });
  }
  return slices;
}

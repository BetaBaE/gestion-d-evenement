import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { impositionGrid } from './printPlan.js';

const MM = 72 / 25.4;
const A4 = { w: 210, h: 297 };

/** Text the standard Helvetica (WinAnsi) can encode; anything else (Arabic, emoji…) becomes "?". */
function encodable(font, text) {
  return [...String(text || '')]
    .map((c) => {
      try {
        font.encodeText(c);
        return c;
      } catch {
        return '?';
      }
    })
    .join('');
}

/** Largest size ≤ max at which the text fits `width`, truncated with "…" below `min`. */
function fitText(font, text, width, max, min) {
  let size = Math.min(max, width / Math.max(1, font.widthOfTextAtSize(text, 1)));
  if (size >= min) return { text, size };
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, min) > width) t = t.slice(0, -1);
  return { text: `${t}…`, size: min };
}

function drawSeparator(doc, font, bold, { wMm, hMm, nom, count }) {
  const page = doc.addPage([wMm * MM, hMm * MM]);
  const w = wMm * MM;
  const h = hMm * MM;
  const pad = Math.min(w, h) * 0.08;
  const scale = Math.min(w, h) / (105 * MM); // A6 = 1
  const label = { text: 'ORGANISME', size: 9 * scale };
  const name = fitText(bold, encodable(bold, nom), w - 2 * pad, 30 * scale, 7);
  const sub = `${count} badge${count > 1 ? 's' : ''}`;
  const subSize = 11 * scale;
  page.drawRectangle({ x: 0, y: h - 6 * scale, width: w, height: 6 * scale, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(label.text, { x: pad, y: h / 2 + name.size * 0.9, size: label.size, font, color: rgb(0.45, 0.45, 0.45) });
  page.drawText(name.text, { x: pad, y: h / 2 - name.size * 0.3, size: name.size, font: bold, color: rgb(0, 0, 0) });
  page.drawText(sub, { x: pad, y: h / 2 - name.size * 0.3 - subSize * 1.8, size: subSize, font, color: rgb(0.3, 0.3, 0.3) });
}

/** Crop marks in the sheet margins, on every column / row boundary of the grid. */
function drawCutMarks(page, grid, cardW, cardH) {
  const len = 5;
  const gap = 2;
  const color = rgb(0, 0, 0);
  const thickness = 0.25;
  const top = A4.h - grid.offsetY; // grid top edge, in mm from the bottom
  const bottom = A4.h - grid.offsetY - grid.rows * cardH;
  const left = grid.offsetX;
  const right = grid.offsetX + grid.cols * cardW;
  const line = (x1, y1, x2, y2) => page.drawLine({ start: { x: x1 * MM, y: y1 * MM }, end: { x: x2 * MM, y: y2 * MM }, thickness, color });
  for (let c = 0; c <= grid.cols; c += 1) {
    const x = left + c * cardW;
    line(x, top + gap, x, top + gap + len);
    line(x, bottom - gap, x, bottom - gap - len);
  }
  for (let r = 0; r <= grid.rows; r += 1) {
    const y = top - r * cardH;
    line(left - gap, y, left - gap - len, y);
    line(right + gap, y, right + gap + len, y);
  }
}

/**
 * Builds one output PDF from rendered chunks (each: { buffer, ids } — one
 * page per participant, in print order).
 * options: { separateurs, planche, organismeOf(id) → { key, nom }, groupCounts: Map(key → n) }
 */
export async function assemblePrintPdf(chunks, { separateurs = false, planche = false, organismeOf, groupCounts, cardMm } = {}) {
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const grid = planche && cardMm ? impositionGrid({ cardW: cardMm.width, cardH: cardMm.height }) : null;

  let sheet = null; // current A4 sheet in imposition mode
  let slot = 0;
  let previousKey;

  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop
    const src = await PDFDocument.load(chunk.buffer);
    const pageCount = src.getPageCount();
    // eslint-disable-next-line no-await-in-loop
    const pages = grid ? await out.embedPages(src.getPages()) : await out.copyPages(src, src.getPageIndices());

    for (let i = 0; i < pageCount; i += 1) {
      const org = organismeOf?.(chunk.ids[i]);
      if (separateurs && org && org.key !== previousKey) {
        // Separator at the badge's own page size (copied PDFPage) or a full A4 sheet.
        const size = grid ? A4 : { w: pages[i].getWidth() / MM, h: pages[i].getHeight() / MM };
        drawSeparator(out, font, bold, { wMm: size.w, hMm: size.h, nom: org.nom, count: groupCounts?.get(org.key) || 0 });
        sheet = null; // the next organisme starts on a fresh sheet
      }
      previousKey = org?.key;

      if (!grid) {
        out.addPage(pages[i]);
        continue;
      }
      if (!sheet || slot >= grid.perSheet) {
        sheet = out.addPage([A4.w * MM, A4.h * MM]);
        drawCutMarks(sheet, grid, cardMm.width, cardMm.height);
        slot = 0;
      }
      const col = slot % grid.cols;
      const row = Math.floor(slot / grid.cols);
      sheet.drawPage(pages[i], {
        x: (grid.offsetX + col * cardMm.width) * MM,
        y: (A4.h - grid.offsetY - (row + 1) * cardMm.height) * MM,
        width: cardMm.width * MM,
        height: cardMm.height * MM,
      });
      slot += 1;
    }
  }
  return Buffer.from(await out.save());
}

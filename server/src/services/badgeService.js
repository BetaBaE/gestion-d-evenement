import PDFDocument from 'pdfkit';
import { generateQrCodeBuffer } from './qrService.js';

const MM_TO_PT = 2.834645669;

function mmToPt(mm) {
  return mm * MM_TO_PT;
}

async function drawBadge(doc, { x, y, widthPt, heightPt, participant, event, categorie, organisme, qrBuffer }) {
  const padding = mmToPt(3);

  doc.save();
  doc.rect(x, y, widthPt, heightPt).stroke('#cccccc');

  const bandHeight = mmToPt(8);
  doc.rect(x, y, widthPt, bandHeight).fill(categorie?.couleur || '#1971c2');
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text(categorie?.nom || '', x + padding, y + (bandHeight - 10) / 2, {
    width: widthPt - padding * 2,
    align: 'center',
  });

  let cursorY = y + bandHeight + mmToPt(2);

  doc.fillColor('#111111').fontSize(13).font('Helvetica-Bold');
  doc.text(`${participant.prenom} ${participant.nom}`, x + padding, cursorY, {
    width: widthPt - padding * 2,
    align: 'center',
  });
  cursorY += mmToPt(6);

  if (event.badgeConfig?.afficherFonction && participant.fonction) {
    doc.fillColor('#444444').fontSize(9).font('Helvetica');
    doc.text(participant.fonction, x + padding, cursorY, {
      width: widthPt - padding * 2,
      align: 'center',
    });
    cursorY += mmToPt(5);
  }

  if (event.badgeConfig?.afficherOrganisme && organisme?.nom) {
    doc.fillColor('#444444').fontSize(8).font('Helvetica-Oblique');
    doc.text(organisme.nom, x + padding, cursorY, {
      width: widthPt - padding * 2,
      align: 'center',
    });
  }

  const qrSize = Math.min(mmToPt(22), heightPt - cursorY - mmToPt(4));
  if (qrSize > 0) {
    doc.image(qrBuffer, x + (widthPt - qrSize) / 2, y + heightPt - qrSize - mmToPt(2), {
      width: qrSize,
      height: qrSize,
    });
  }

  doc.restore();
}

export async function generateSingleBadgePdf({ participant, event, categorie, organisme }) {
  const { largeurMm, hauteurMm, orientation } = event.badgeConfig || {};
  const isLandscape = orientation === 'paysage';
  const widthMm = isLandscape ? Math.max(largeurMm, hauteurMm) : Math.min(largeurMm, hauteurMm);
  const heightMm = isLandscape ? Math.min(largeurMm, hauteurMm) : Math.max(largeurMm, hauteurMm);

  const widthPt = mmToPt(widthMm);
  const heightPt = mmToPt(heightMm);

  const doc = new PDFDocument({ size: [widthPt, heightPt], margin: 0 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const qrBuffer = await generateQrCodeBuffer(participant.badgeCode);
  await drawBadge(doc, {
    x: 0,
    y: 0,
    widthPt,
    heightPt,
    participant,
    event,
    categorie,
    organisme,
    qrBuffer,
  });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function generateBatchBadgesPdf(entries) {
  const doc = new PDFDocument({ size: 'A4', margin: mmToPt(10) });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const { largeurMm, hauteurMm, orientation } = entries[0]?.event.badgeConfig || {};
  const isLandscape = orientation === 'paysage';
  const widthMm = isLandscape ? Math.max(largeurMm, hauteurMm) : Math.min(largeurMm, hauteurMm);
  const heightMm = isLandscape ? Math.min(largeurMm, hauteurMm) : Math.max(largeurMm, hauteurMm);
  const widthPt = mmToPt(widthMm);
  const heightPt = mmToPt(heightMm);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  const gap = mmToPt(4);
  const cols = Math.max(1, Math.floor((pageWidth + gap) / (widthPt + gap)));
  const rows = Math.max(1, Math.floor((pageHeight + gap) / (heightPt + gap)));
  const perPage = cols * rows;

  for (let i = 0; i < entries.length; i += 1) {
    const { participant, event, categorie, organisme } = entries[i];
    const positionOnPage = i % perPage;

    if (i > 0 && positionOnPage === 0) {
      doc.addPage();
    }

    const col = positionOnPage % cols;
    const row = Math.floor(positionOnPage / cols);
    const x = doc.page.margins.left + col * (widthPt + gap);
    const y = doc.page.margins.top + row * (heightPt + gap);

    const qrBuffer = await generateQrCodeBuffer(participant.badgeCode);
    await drawBadge(doc, { x, y, widthPt, heightPt, participant, event, categorie, organisme, qrBuffer });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

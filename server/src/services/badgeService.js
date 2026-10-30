import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { generateQrCodeBuffer } from './qrService.js';
import { getImageWithData } from './imageService.js';

const MM_TO_PT = 2.834645669;

function mmToPt(mm) {
  return mm * MM_TO_PT;
}

async function loadImageBuffer(imageId) {
  if (!imageId) return null;
  const image = await getImageWithData(imageId);
  if (!image?.data) return null;
  // pdfkit can only embed JPEG or PNG; stored images are WebP, so convert
  // on the fly here rather than storing a second copy of every image.
  return sharp(image.data).png().toBuffer();
}

async function drawBadge(doc, { x, y, widthPt, heightPt, participant, event, categorie, organisme, qrBuffer, images }) {
  const padding = mmToPt(3);
  const badgeConfig = event.badgeConfig || {};

  doc.save();

  if (images.fond) {
    doc.image(images.fond, x, y, { width: widthPt, height: heightPt });
  }

  doc.rect(x, y, widthPt, heightPt).stroke('#cccccc');

  let cursorY = y + mmToPt(2);

  if (badgeConfig.afficherLogoOrganisateur && images.logoOrganisateur) {
    const logoHeight = mmToPt(8);
    doc.image(images.logoOrganisateur, x + padding, cursorY, { fit: [widthPt - padding * 2, logoHeight], align: 'center' });
    cursorY += logoHeight + mmToPt(2);
  }

  if (badgeConfig.afficherPhoto && images.photo) {
    const photoSize = mmToPt(18);
    doc.image(images.photo, x + (widthPt - photoSize) / 2, cursorY, { width: photoSize, height: photoSize });
    cursorY += photoSize + mmToPt(2);
  }

  doc.fillColor('#111111').fontSize(13).font('Helvetica-Bold');
  doc.text(`${participant.prenom} ${participant.nom}`, x + padding, cursorY, {
    width: widthPt - padding * 2,
    align: 'center',
  });
  cursorY += mmToPt(6);

  if (badgeConfig.afficherFonction && participant.fonction) {
    doc.fillColor('#444444').fontSize(9).font('Helvetica');
    doc.text(participant.fonction, x + padding, cursorY, {
      width: widthPt - padding * 2,
      align: 'center',
    });
    cursorY += mmToPt(5);
  }

  if (badgeConfig.afficherOrganisme && organisme?.nom) {
    if (badgeConfig.afficherLogoOrganisme && images.logoOrganisme) {
      const organismeLogoHeight = mmToPt(6);
      doc.image(images.logoOrganisme, x + (widthPt - organismeLogoHeight) / 2, cursorY, {
        fit: [widthPt - padding * 2, organismeLogoHeight],
        align: 'center',
      });
      cursorY += organismeLogoHeight + mmToPt(1);
    } else {
      doc.fillColor('#444444').fontSize(8).font('Helvetica-Oblique');
      doc.text(organisme.nom, x + padding, cursorY, {
        width: widthPt - padding * 2,
        align: 'center',
      });
      cursorY += mmToPt(4);
    }
  }

  const bandHeight = mmToPt(6);
  const bandY = y + heightPt - bandHeight;
  doc.rect(x, bandY, widthPt, bandHeight).fill(categorie?.couleur || badgeConfig.couleurPrincipale || '#1971c2');
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text(categorie?.nom || '', x + padding, bandY + (bandHeight - 10) / 2, {
    width: widthPt - padding * 2 - mmToPt(10),
    align: 'left',
  });

  const qrSize = Math.min(mmToPt(10), bandHeight - mmToPt(1));
  doc.image(qrBuffer, x + widthPt - qrSize - mmToPt(2), bandY + (bandHeight - qrSize) / 2, {
    width: qrSize,
    height: qrSize,
  });

  doc.restore();
}

async function loadSharedImages(event, organisateur) {
  const badgeConfig = event.badgeConfig || {};
  const [fond, logoOrganisateur] = await Promise.all([
    loadImageBuffer(badgeConfig.fondImageId),
    loadImageBuffer(organisateur?.logoImageId),
  ]);
  return { fond, logoOrganisateur };
}

async function loadPerParticipantImages({ participant, organisme }) {
  const [photo, logoOrganisme] = await Promise.all([
    loadImageBuffer(participant.photoImageId),
    loadImageBuffer(organisme?.logoImageId),
  ]);
  return { photo, logoOrganisme };
}

export async function generateSingleBadgePdf({ participant, event, categorie, organisme, organisateur }) {
  const { largeurMm, hauteurMm, orientation } = event.badgeConfig || {};
  const isLandscape = orientation === 'paysage';
  const widthMm = isLandscape ? Math.max(largeurMm, hauteurMm) : Math.min(largeurMm, hauteurMm);
  const heightMm = isLandscape ? Math.min(largeurMm, hauteurMm) : Math.max(largeurMm, hauteurMm);

  const widthPt = mmToPt(widthMm);
  const heightPt = mmToPt(heightMm);

  const doc = new PDFDocument({ size: [widthPt, heightPt], margin: 0 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const [qrBuffer, sharedImages, participantImages] = await Promise.all([
    generateQrCodeBuffer(participant.badgeCode),
    loadSharedImages(event, organisateur),
    loadPerParticipantImages({ participant, organisme }),
  ]);

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
    images: { ...sharedImages, ...participantImages },
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

  const sharedImagesCache = new Map();

  for (let i = 0; i < entries.length; i += 1) {
    const { participant, event, categorie, organisme, organisateur } = entries[i];
    const positionOnPage = i % perPage;

    if (i > 0 && positionOnPage === 0) {
      doc.addPage();
    }

    const col = positionOnPage % cols;
    const row = Math.floor(positionOnPage / cols);
    const x = doc.page.margins.left + col * (widthPt + gap);
    const y = doc.page.margins.top + row * (heightPt + gap);

    const eventKey = event._id.toString();
    if (!sharedImagesCache.has(eventKey)) {
      sharedImagesCache.set(eventKey, await loadSharedImages(event, organisateur));
    }

    const [qrBuffer, participantImages] = await Promise.all([
      generateQrCodeBuffer(participant.badgeCode),
      loadPerParticipantImages({ participant, organisme }),
    ]);

    await drawBadge(doc, {
      x,
      y,
      widthPt,
      heightPt,
      participant,
      event,
      categorie,
      organisme,
      qrBuffer,
      images: { ...sharedImagesCache.get(eventKey), ...participantImages },
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

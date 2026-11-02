import QRCode from 'qrcode';

export async function generateQrCodeDataUrl(badgeCode) {
  return QRCode.toDataURL(badgeCode, { margin: 1, width: 300 });
}

export async function generateQrCodeBuffer(badgeCode) {
  return QRCode.toBuffer(badgeCode, { margin: 1, width: 300 });
}

export async function generateQrCodeSvg(badgeCode) {
  return QRCode.toString(badgeCode, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}

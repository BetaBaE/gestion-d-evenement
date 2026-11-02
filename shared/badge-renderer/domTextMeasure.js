/**
 * Real text measurement via a hidden canvas — works in any browser context
 * (the editor iframe, or Puppeteer's Chromium), never in plain Node. Kept
 * separate from textFit.js so that pure function stays unit-testable with
 * a fake measurer. Must stay in sync with createDomTextMeasurer in
 * browserFit.js (the copy Puppeteer injects).
 *
 * Takes the span's computed style because weight, style, letter-spacing and
 * an uppercase transform all change the rendered width — measuring the raw
 * text in a plain font makes bold uppercase names overflow their box.
 */
let measureCanvas = null;

const PT_TO_PX = 96 / 72;
const PX_TO_MM = 25.4 / 96;

export function createDomTextMeasurer(computed, doc = document) {
  if (!measureCanvas) {
    measureCanvas = doc.createElement('canvas');
  }
  const ctx = measureCanvas.getContext('2d');
  const uppercase = computed.textTransform === 'uppercase';
  const letterSpacingPx = parseFloat(computed.letterSpacing) || 0;
  const prefix = `${computed.fontStyle || 'normal'} ${computed.fontWeight || '400'} `;
  const family = computed.fontFamily || 'sans-serif';

  return function measureTextWidthMm(text, fontSizePt) {
    const t = uppercase ? text.toUpperCase() : text;
    ctx.font = `${prefix}${fontSizePt * PT_TO_PX}px ${family}`;
    return (ctx.measureText(t).width + letterSpacingPx * t.length) * PX_TO_MM;
  };
}

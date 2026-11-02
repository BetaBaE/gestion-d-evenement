import { fitText } from './textFit.js';
import { createDomTextMeasurer } from './domTextMeasure.js';

const MM_PER_PX_96DPI = 25.4 / 96;

/**
 * ES-module twin of window.__badgeRendererFit in browserFit.js (which is
 * what Puppeteer injects): measures every .el-dynamictext against its real
 * rendered font and rewrites it into fitted, non-wrapping lines. Used by
 * the editor canvas. `root` may be a Document or any container Element.
 * Returns the ids of elements whose text got truncated.
 */
export function fitDynamicTextInDom(root = document) {
  const truncatedElementIds = [];
  const doc = root.ownerDocument || root;

  root.querySelectorAll('.el-dynamictext').forEach((span) => {
    const rawText = span.getAttribute('data-raw-text') || '';
    const wrapper = span.closest('.el-wrapper');
    if (!wrapper) return;

    const widthMm = wrapper.clientWidth * MM_PER_PX_96DPI;
    const heightMm = wrapper.clientHeight * MM_PER_PX_96DPI;
    const computed = doc.defaultView.getComputedStyle(span);

    const style = {
      tailleMax: Number(wrapper.dataset.tailleMax) || 14,
      tailleMin: Number(wrapper.dataset.tailleMin) || 6,
      interligne: Number(wrapper.dataset.interligne) || 1.2,
      lignesMax: Number(wrapper.dataset.lignesMax) || 1,
    };

    const measure = createDomTextMeasurer(computed, doc);
    const fit = fitText(rawText, { widthMm, heightMm }, style, measure);

    span.innerHTML = fit.lines.map((line) => `<span class="el-line">${escapeHtml(line)}</span>`).join('');
    span.style.fontSize = `${fit.fontSizePt}pt`;
    span.style.lineHeight = String(style.interligne);

    if (fit.truncated) {
      truncatedElementIds.push(wrapper.getAttribute('data-element-id'));
    }
  });

  return { truncatedElementIds };
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

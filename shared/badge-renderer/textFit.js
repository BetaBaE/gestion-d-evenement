/**
 * Fits text into a fixed box: shrink the font from tailleMax down to
 * tailleMin, then wrap up to lignesMax lines, then truncate the last line
 * with "…" if it still doesn't fit. Pure function — takes a `measureText`
 * callback so it can be unit-tested with a deterministic fake measurer
 * instead of requiring a real browser/Canvas font-measurement environment
 * (the risk the addendum calls out explicitly). Used by the editor iframe
 * (via fitDynamicTextInDom.js) as a real ES module. Puppeteer instead
 * injects browserFit.js, a plain-script duplicate of this same algorithm
 * (relative ES imports aren't reliable to inject into a Puppeteer page) —
 * if this function's logic changes, browserFit.js's fitText must change
 * identically or the editor and the printed PDF will fit text differently.
 *
 * @param {string} text
 * @param {object} box - { widthMm, heightMm }
 * @param {object} style - { tailleMax, tailleMin, interligne, lignesMax }
 * @param {(text: string, fontSizePt: number) => number} measureTextWidthMm
 * @returns {{ fontSizePt: number, lines: string[], truncated: boolean }}
 */
export function fitText(text, box, style, measureTextWidthMm) {
  const tailleMax = style.tailleMax ?? 14;
  const tailleMin = Math.max(style.tailleMin ?? 6, 6);
  const interligne = style.interligne ?? 1.2;
  const lignesMax = style.lignesMax ?? 1;

  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    return { fontSizePt: tailleMax, lines: [], truncated: false };
  }

  for (let fontSizePt = tailleMax; fontSizePt >= tailleMin; fontSizePt -= 0.5) {
    const lineHeightMm = ptToMm(fontSizePt) * interligne;
    const maxLines = Math.max(1, Math.min(lignesMax, Math.floor(box.heightMm / lineHeightMm) || 1));
    const lines = wrapText(clean, box.widthMm, fontSizePt, measureTextWidthMm, maxLines);

    if (lines.fitsWithoutTruncation) {
      return { fontSizePt, lines: lines.lines, truncated: false };
    }
    if (fontSizePt <= tailleMin) {
      return { fontSizePt: tailleMin, lines: lines.lines, truncated: true };
    }
  }

  // Unreachable in practice (loop always returns at fontSizePt === tailleMin),
  // kept as a safe fallback if tailleMin > tailleMax was misconfigured.
  const lineHeightMm = ptToMm(tailleMin) * interligne;
  const maxLines = Math.max(1, Math.min(lignesMax, Math.floor(box.heightMm / lineHeightMm) || 1));
  const fallback = wrapText(clean, box.widthMm, tailleMin, measureTextWidthMm, maxLines);
  return { fontSizePt: tailleMin, lines: fallback.lines, truncated: !fallback.fitsWithoutTruncation };
}

function ptToMm(pt) {
  return pt * 0.3528;
}

/**
 * Greedy word-wrap into at most maxLines lines at the given font size.
 * If the content doesn't fit in maxLines, the last line is truncated with
 * an ellipsis and fitsWithoutTruncation is false.
 */
function wrapText(text, widthMm, fontSizePt, measureTextWidthMm, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (measureTextWidthMm(candidate, fontSizePt) <= widthMm) {
      current = candidate;
      continue;
    }

    if (!current) {
      // A single word is already wider than the box — force it onto its
      // own line rather than looping forever; it may get truncated below.
      lines.push(word);
      current = '';
    } else {
      lines.push(current);
      current = word;
    }

    if (lines.length >= maxLines) {
      current = '';
      break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  const consumedAllWords = lines.join(' ').split(' ').length >= words.length;
  if (consumedAllWords && lines.every((line) => measureTextWidthMm(line, fontSizePt) <= widthMm)) {
    return { lines, fitsWithoutTruncation: true };
  }

  // Doesn't fit: truncate the last line with an ellipsis until it fits.
  const truncatedLines = lines.length > 0 ? lines : [''];
  let lastLine = truncatedLines[truncatedLines.length - 1];
  while (lastLine.length > 1 && measureTextWidthMm(`${lastLine}…`, fontSizePt) > widthMm) {
    lastLine = lastLine.slice(0, -1);
  }
  truncatedLines[truncatedLines.length - 1] = `${lastLine}…`;

  return { lines: truncatedLines, fitsWithoutTruncation: false };
}

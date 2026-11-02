/**
 * Self-contained (no import/export) browser-side fitting script, injected
 * into both the editor iframe and Puppeteer's page via addScriptTag/
 * evaluate. Duplicates the pure logic of textFit.js + domTextMeasure.js +
 * fitDynamicTextInDom.js in a single non-module file because Puppeteer's
 * injected scripts and the editor iframe's srcDoc can't reliably resolve
 * relative ES module imports — this file is the single source of truth for
 * that logic; textFit.js (the ES module, unit-tested) must be kept in sync
 * with the fitText() function below if the algorithm changes.
 *
 * Exposes window.__badgeRendererFit() which the caller invokes after the
 * static HTML has rendered.
 */
(function () {
  function ptToMm(pt) {
    return pt * 0.3528;
  }

  function wrapText(text, widthMm, fontSizePt, measureTextWidthMm, maxLines) {
    var words = text.split(' ');
    var lines = [];
    var current = '';

    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      var candidate = current ? current + ' ' + word : word;
      if (measureTextWidthMm(candidate, fontSizePt) <= widthMm) {
        current = candidate;
        continue;
      }

      if (!current) {
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

    var consumedAllWords = lines.join(' ').split(' ').length >= words.length;
    var allLinesFit = true;
    for (var j = 0; j < lines.length; j++) {
      if (measureTextWidthMm(lines[j], fontSizePt) > widthMm) allLinesFit = false;
    }
    if (consumedAllWords && allLinesFit) {
      return { lines: lines, fitsWithoutTruncation: true };
    }

    var truncatedLines = lines.length > 0 ? lines : [''];
    var lastLine = truncatedLines[truncatedLines.length - 1];
    while (lastLine.length > 1 && measureTextWidthMm(lastLine + '…', fontSizePt) > widthMm) {
      lastLine = lastLine.slice(0, -1);
    }
    truncatedLines[truncatedLines.length - 1] = lastLine + '…';

    return { lines: truncatedLines, fitsWithoutTruncation: false };
  }

  function fitText(text, box, style, measureTextWidthMm) {
    var tailleMax = style.tailleMax || 14;
    var tailleMin = Math.max(style.tailleMin || 6, 6);
    var interligne = style.interligne || 1.2;
    var lignesMax = style.lignesMax || 1;

    var clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) {
      return { fontSizePt: tailleMax, lines: [], truncated: false };
    }

    for (var fontSizePt = tailleMax; fontSizePt >= tailleMin; fontSizePt -= 0.5) {
      var lineHeightMm = ptToMm(fontSizePt) * interligne;
      var maxLines = Math.max(1, Math.min(lignesMax, Math.floor(box.heightMm / lineHeightMm) || 1));
      var result = wrapText(clean, box.widthMm, fontSizePt, measureTextWidthMm, maxLines);

      if (result.fitsWithoutTruncation) {
        return { fontSizePt: fontSizePt, lines: result.lines, truncated: false };
      }
      if (fontSizePt <= tailleMin) {
        return { fontSizePt: tailleMin, lines: result.lines, truncated: true };
      }
    }

    var fallbackLineHeightMm = ptToMm(tailleMin) * interligne;
    var fallbackMaxLines = Math.max(1, Math.min(lignesMax, Math.floor(box.heightMm / fallbackLineHeightMm) || 1));
    var fallback = wrapText(clean, box.widthMm, tailleMin, measureTextWidthMm, fallbackMaxLines);
    return { fontSizePt: tailleMin, lines: fallback.lines, truncated: !fallback.fitsWithoutTruncation };
  }

  var measureCanvas = null;
  // Measures with the span's real rendered font: weight, style, family,
  // letter-spacing and uppercase transform all change the width, and
  // ignoring any of them makes the browser re-wrap text the fit thought
  // was fine (bold uppercase names overflowing their box).
  function createDomTextMeasurer(computed) {
    if (!measureCanvas) measureCanvas = document.createElement('canvas');
    var ctx = measureCanvas.getContext('2d');
    var PT_TO_PX = 96 / 72;
    var PX_TO_MM = 25.4 / 96;
    var uppercase = computed.textTransform === 'uppercase';
    var letterSpacingPx = parseFloat(computed.letterSpacing) || 0;
    var prefix = (computed.fontStyle || 'normal') + ' ' + (computed.fontWeight || '400') + ' ';
    var family = computed.fontFamily || 'sans-serif';
    return function (text, fontSizePt) {
      var t = uppercase ? text.toUpperCase() : text;
      ctx.font = prefix + fontSizePt * PT_TO_PX + 'px ' + family;
      return (ctx.measureText(t).width + letterSpacingPx * t.length) * PX_TO_MM;
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var MM_PER_PX_96DPI = 25.4 / 96;

  window.__badgeRendererFit = function () {
    var truncatedElementIds = [];
    var spans = document.querySelectorAll('.el-dynamictext');

    for (var i = 0; i < spans.length; i++) {
      var span = spans[i];
      var rawText = span.getAttribute('data-raw-text') || '';
      var wrapper = span.closest('.el-wrapper');
      if (!wrapper) continue;

      var widthMm = wrapper.clientWidth * MM_PER_PX_96DPI;
      var heightMm = wrapper.clientHeight * MM_PER_PX_96DPI;
      var computed = window.getComputedStyle(span);

      var style = {
        tailleMax: Number(wrapper.dataset.tailleMax) || 14,
        tailleMin: Number(wrapper.dataset.tailleMin) || 6,
        interligne: Number(wrapper.dataset.interligne) || 1.2,
        lignesMax: Number(wrapper.dataset.lignesMax) || 1,
      };

      var measure = createDomTextMeasurer(computed);
      var fit = fitText(rawText, { widthMm: widthMm, heightMm: heightMm }, style, measure);

      // One nowrap block per fitted line, with the same line-height the fit
      // assumed, so the browser can never re-wrap a line on its own.
      var html = [];
      for (var l = 0; l < fit.lines.length; l++) {
        html.push('<span class="el-line">' + escapeHtml(fit.lines[l]) + '</span>');
      }
      span.innerHTML = html.join('');
      span.style.fontSize = fit.fontSizePt + 'pt';
      span.style.lineHeight = String(style.interligne);

      if (fit.truncated) {
        truncatedElementIds.push(wrapper.getAttribute('data-element-id'));
      }
    }

    return { truncatedElementIds: truncatedElementIds };
  };
})();

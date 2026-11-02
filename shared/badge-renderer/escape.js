export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders the limited rich-text format used by the `texte` block: plain
 * text with {{b}}...{{/b}}, {{i}}...{{/i}}, {{br}}, and
 * {{a:https://...}}...{{/a}} markers. Never raw HTML from user input, so
 * there is no sanitizer to bypass — the output can only ever contain the
 * tags in ALLOWED_RICH_TEXT_TAGS.
 */
export function renderRichText(source) {
  if (!source) return '';
  let out = esc(source);
  out = out.replace(/\{\{b\}\}/g, '<b>').replace(/\{\{\/b\}\}/g, '</b>');
  out = out.replace(/\{\{i\}\}/g, '<i>').replace(/\{\{\/i\}\}/g, '</i>');
  out = out.replace(/\{\{br\}\}/g, '<br>');
  out = out.replace(/\{\{a:(https?:\/\/[^}]+)\}\}/g, (_match, url) => `<a href="${esc(url)}">`);
  out = out.replace(/\{\{\/a\}\}/g, '</a>');
  return out;
}

export function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function isValidHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Accepts #RGB or #RRGGBB (with or without #, any case) and returns
 * uppercase #RRGGBB, or null if it isn't a valid hex color.
 */
export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

export const DEFAULT_PALETTE = [
  '#1971C2',
  '#2F9E44',
  '#E03131',
  '#F08C00',
  '#7048E8',
  '#0C8599',
  '#E64980',
  '#212529',
  '#868E96',
  '#FFFFFF',
];

import { activePanels, panelOrigin, panelSizeMm, round1 } from './geometry.js';

const CASCADE_MM = 3;
const DEFAULT_SAFE_MM = 5;

/**
 * The panel new elements go to, in priority order: the selected element's
 * panel, the last panel clicked, the panel at the centre of the visible
 * canvas, then P1. Panels that aren't active on this badge are skipped.
 */
export function pickActivePanel({ badge, selectedPanel, lastClickedPanel, centerPanel }) {
  const panels = activePanels(badge);
  return [selectedPanel, lastClickedPanel, centerPanel].find((p) => p && panels.includes(p)) || 'P1';
}

/** Panel under a point of the sheet (mm), with the point in that panel's coordinates. */
export function panelAtSheetPoint(badge, xMm, yMm) {
  const { width, height } = panelSizeMm(badge);
  for (const key of activePanels(badge)) {
    const o = panelOrigin(badge, key);
    if (xMm >= o.x && xMm < o.x + width && yMm >= o.y && yMm < o.y + height) {
      return { panneau: key, x: xMm - o.x, y: yMm - o.y };
    }
  }
  return null;
}

/**
 * Where a new element goes inside its panel.
 *
 * - Too big for the panel's safe zone → scaled down to fit (keeping its ratio).
 * - `at` (panel-local mm, e.g. a drop point) → centred on that point.
 * - otherwise → centred in the safe zone.
 * - If another element of the panel already sits exactly there, shift by
 *   +3 mm / +3 mm until the spot is free, so additions never stack unseen.
 * - Always kept inside the panel.
 * `fullWidth` (category band) spans the whole panel width at x = 0.
 */
export function placeNewElement({ badge, panneau, elements, size, at, fullWidth = false }) {
  const panel = panelSizeMm(badge);
  const safe = badge.safeZoneMm ?? DEFAULT_SAFE_MM;
  const zone = { x: safe, y: safe, width: panel.width - 2 * safe, height: panel.height - 2 * safe };

  let { largeur, hauteur } = size;
  if (fullWidth) {
    largeur = panel.width;
  } else {
    const scale = Math.min(1, zone.width / largeur, zone.height / hauteur);
    largeur *= scale;
    hauteur *= scale;
  }
  hauteur = Math.min(hauteur, panel.height);

  const center = at || { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
  let x = fullWidth ? 0 : center.x - largeur / 2;
  let y = center.y - hauteur / 2;

  const clamp = () => {
    x = Math.min(Math.max(x, 0), panel.width - largeur);
    y = Math.min(Math.max(y, 0), panel.height - hauteur);
  };
  clamp();

  const taken = elements.filter((e) => e.panneau === panneau);
  const occupied = () => taken.some((e) => Math.abs(e.x - x) < 0.05 && Math.abs(e.y - y) < 0.05);
  for (let i = 0; i < 50 && occupied(); i += 1) {
    if (!fullWidth) x += CASCADE_MM;
    y += CASCADE_MM;
    // Ran off the panel: restart the cascade from the top-left of the safe zone.
    if (x + largeur > panel.width || y + hauteur > panel.height) {
      x = fullWidth ? 0 : zone.x + (i % 5) * CASCADE_MM;
      y = zone.y + (i % 5) * CASCADE_MM;
    }
    clamp();
  }

  return { x: round1(x), y: round1(y), largeur: round1(largeur), hauteur: round1(hauteur) };
}

/**
 * Pasting a set of elements into `panneau`: same relative positions if the
 * whole set fits where it was, otherwise the set is centred in the panel.
 * Returns the new { x, y } for each source element, in order.
 */
export function placePastedElements({ badge, source }) {
  const panel = panelSizeMm(badge);
  const minX = Math.min(...source.map((e) => e.x));
  const minY = Math.min(...source.map((e) => e.y));
  const maxX = Math.max(...source.map((e) => e.x + e.largeur));
  const maxY = Math.max(...source.map((e) => e.y + e.hauteur));
  const fits = minX >= 0 && minY >= 0 && maxX <= panel.width && maxY <= panel.height;
  const dx = fits ? 0 : (panel.width - (maxX - minX)) / 2 - minX;
  const dy = fits ? 0 : (panel.height - (maxY - minY)) / 2 - minY;
  return source.map((e) => ({ x: round1(e.x + dx), y: round1(e.y + dy) }));
}

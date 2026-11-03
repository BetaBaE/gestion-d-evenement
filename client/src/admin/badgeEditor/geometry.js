import { activePanelKeys, panelSizeMm } from '../../../../shared/badge-renderer/index.js';

// CSS px are defined at 96 per inch, so 1mm is exactly 96/25.4 CSS px —
// the same conversion the browser uses for the renderer's mm units.
export const PX_PER_MM = 96 / 25.4;

export const pxToMm = (px) => px / PX_PER_MM;
export const mmToPx = (mm) => mm * PX_PER_MM;
export const round1 = (v) => Math.round(v * 10) / 10;

// Position of each panel on the sheet, in mm (A4 folded in 4: P1 | P3 on
// top, P2 | P4 below — matches the renderer's grid placement).
const A4_ORIGINS = { P1: { x: 0, y: 0 }, P3: { x: 105, y: 0 }, P2: { x: 0, y: 148.5 }, P4: { x: 105, y: 148.5 } };

/** Panels that print (A4: P1 + the active ones among P2–P4; other formats: P1). */
export function activePanels(badge) {
  return activePanelKeys(badge);
}

export function panelOrigin(badge, panelKey) {
  return badge.format === 'A4_PLIE_4' ? A4_ORIGINS[panelKey] : { x: 0, y: 0 };
}

export function sheetSizeMm(badge) {
  if (badge.format === 'A4_PLIE_4') return { width: 210, height: 297 };
  return panelSizeMm(badge);
}

export { panelSizeMm };

/** Keeps an element fully inside its panel (Addendum 3 v2 §5.1). */
export function clampToPanel(el, badge) {
  const { width, height } = panelSizeMm(badge);
  const largeur = Math.min(el.largeur, width);
  const hauteur = Math.min(el.hauteur, height);
  return {
    ...el,
    largeur: round1(largeur),
    hauteur: round1(hauteur),
    x: round1(Math.min(Math.max(el.x, 0), width - largeur)),
    y: round1(Math.min(Math.max(el.y, 0), height - hauteur)),
  };
}

/**
 * After a move, the element's new top-left is given relative to the panel
 * it started in. If its centre now sits over a different panel, it moves
 * to that panel (spec: "dragging it into another panel moves it there");
 * either way it's then clamped inside its panel.
 */
export function settleAfterMove(el, badge) {
  const origin = panelOrigin(badge, el.panneau);
  const centerX = origin.x + el.x + el.largeur / 2;
  const centerY = origin.y + el.y + el.hauteur / 2;

  let panneau = el.panneau;
  for (const key of activePanels(badge)) {
    const o = panelOrigin(badge, key);
    const { width, height } = panelSizeMm(badge);
    if (centerX >= o.x && centerX < o.x + width && centerY >= o.y && centerY < o.y + height) {
      panneau = key;
      break;
    }
  }

  const target = panelOrigin(badge, panneau);
  return clampToPanel(
    { ...el, panneau, x: el.x + origin.x - target.x, y: el.y + origin.y - target.y },
    badge,
  );
}

/**
 * Aligns elements (panel-local coordinates) to the selection's bounding box,
 * or — for a single element, given `panel` ({ width, height }) — to its panel.
 */
export function alignElements(elements, mode, panel) {
  const single = elements.length === 1 && panel;
  const minX = single ? 0 : Math.min(...elements.map((e) => e.x));
  const maxX = single ? panel.width : Math.max(...elements.map((e) => e.x + e.largeur));
  const minY = single ? 0 : Math.min(...elements.map((e) => e.y));
  const maxY = single ? panel.height : Math.max(...elements.map((e) => e.y + e.hauteur));

  return elements.map((e) => {
    switch (mode) {
      case 'gauche':
        return { ...e, x: round1(minX) };
      case 'centreH':
        return { ...e, x: round1((minX + maxX) / 2 - e.largeur / 2) };
      case 'droite':
        return { ...e, x: round1(maxX - e.largeur) };
      case 'haut':
        return { ...e, y: round1(minY) };
      case 'milieu':
        return { ...e, y: round1((minY + maxY) / 2 - e.hauteur / 2) };
      case 'bas':
        return { ...e, y: round1(maxY - e.hauteur) };
      default:
        return e;
    }
  });
}

/** Spreads elements so the gaps between them are equal (needs 3+). */
export function distributeElements(elements, axis) {
  if (elements.length < 3) return elements;
  const pos = axis === 'h' ? 'x' : 'y';
  const size = axis === 'h' ? 'largeur' : 'hauteur';
  const sorted = [...elements].sort((a, b) => a[pos] - b[pos]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSize = sorted.reduce((sum, e) => sum + e[size], 0);
  const gap = (last[pos] + last[size] - first[pos] - totalSize) / (sorted.length - 1);

  let cursor = first[pos];
  const placed = new Map();
  sorted.forEach((e) => {
    placed.set(e.id, { ...e, [pos]: round1(cursor) });
    cursor += e[size] + gap;
  });
  return elements.map((e) => placed.get(e.id));
}

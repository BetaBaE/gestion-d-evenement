export const ALL_PANELS = ['P1', 'P2', 'P3', 'P4'];

/**
 * Panels that print for this badge. A4 folded in 4 uses P1 plus the panels
 * listed in `panneauxActifs` (all four when it isn't set); A6 and card
 * formats only have P1. Elements on other panels are "hors page": kept in
 * the badge but never rendered.
 */
export function activePanelKeys(badge) {
  if (badge?.format !== 'A4_PLIE_4') return ['P1'];
  if (!Array.isArray(badge.panneauxActifs) || badge.panneauxActifs.length === 0) return [...ALL_PANELS];
  return ALL_PANELS.filter((key) => key === 'P1' || badge.panneauxActifs.includes(key));
}

/** Elements placed on a panel that doesn't print. */
export function elementsHorsPage(badge) {
  const active = activePanelKeys(badge);
  return (badge?.elements || []).filter((el) => !active.includes(el.panneau));
}

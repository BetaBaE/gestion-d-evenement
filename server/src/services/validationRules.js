/**
 * Event "mode de validation" (pure, unit tested): whether a new registration
 * is validated straight away — and gets its badge email — or waits for a
 * gestionnaire.
 *   MANUELLE             every registration waits (default)
 *   AUTOMATIQUE          every registration is validated
 *   AUTOMATIQUE_PARTIEL  validated when its catégorie or its organisme is listed
 */
export const MODES_VALIDATION = ['MANUELLE', 'AUTOMATIQUE', 'AUTOMATIQUE_PARTIEL'];

const listed = (ids, id) => id != null && (ids || []).some((x) => String(x) === String(id));

export function autoValidates(validation, { categorieId, invitedOrganismId }) {
  const mode = validation?.mode || 'MANUELLE';
  if (mode === 'AUTOMATIQUE') return true;
  if (mode === 'AUTOMATIQUE_PARTIEL') return listed(validation.categorieIds, categorieId) || listed(validation.organismeIds, invitedOrganismId);
  return false;
}

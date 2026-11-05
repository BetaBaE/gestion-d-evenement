/** Same rule as the server (server/src/services/validationRules.js), for form defaults. */
export function autoValidates(validation, { categorieId, invitedOrganismId }) {
  const mode = validation?.mode || 'MANUELLE';
  const listed = (ids, id) => id != null && (ids || []).some((x) => String(x) === String(id));
  if (mode === 'AUTOMATIQUE') return true;
  if (mode === 'AUTOMATIQUE_PARTIEL') return listed(validation.categorieIds, categorieId) || listed(validation.organismeIds, invitedOrganismId);
  return false;
}

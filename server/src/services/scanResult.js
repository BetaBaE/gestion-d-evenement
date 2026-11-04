/**
 * Outcome of a badge scan (pure, unit tested).
 *
 * - INCONNU     no participant with this badge code in the event → nothing recorded
 * - NON_VALIDE  participant exists but is EN_ATTENTE / REFUSE   → nothing recorded
 * - DEJA_SCANNE scanned again within the anti-duplicate window  → nothing recorded
 * - OK          valid participant, outside the window           → a new entry is recorded
 *
 * `lastScan` is the participant's latest scan of the same kind (real or
 * test). A last scan dated in the future (clock drift, bad data) never
 * blocks an entry.
 */
export function classifyScan({ participant, lastScan, now = new Date(), antiDoublonMinutes = 0 }) {
  if (!participant) return { result: 'INCONNU' };
  if (participant.statut !== 'VALIDE') return { result: 'NON_VALIDE', statut: participant.statut };

  if (lastScan) {
    const seconds = Math.round((new Date(now).getTime() - new Date(lastScan.horodatage).getTime()) / 1000);
    if (seconds >= 0 && seconds < antiDoublonMinutes * 60) {
      return { result: 'DEJA_SCANNE', dernierScanIlYa: seconds, dernierScanA: new Date(lastScan.horodatage) };
    }
  }
  return { result: 'OK' };
}

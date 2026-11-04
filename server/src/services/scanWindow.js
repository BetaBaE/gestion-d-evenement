import { DateTime } from 'luxon';

export const DEFAULT_TIMEZONE = 'Africa/Casablanca';

/**
 * When the scan link of an event is open. Pure: everything comes from the
 * arguments, nothing is read from the database or the clock.
 *
 * - AUTO (default): start of dateDebut's day → end of dateFin's day, in the
 *   app time zone, computed from the event's current dates at every call —
 *   so editing the dates moves the window, no regeneration needed.
 * - MANUEL: the stored scanTokenValidFrom / scanTokenValidUntil (falls back
 *   to AUTO if either is missing).
 *
 * Returns { status: 'PAS_ENCORE' | 'ACTIF' | 'EXPIRE', mode, from, until }.
 */
export function getScanWindow(event, now = new Date(), timezone = DEFAULT_TIMEZONE) {
  const manual = event.scanWindowMode === 'MANUEL' && event.scanTokenValidFrom && event.scanTokenValidUntil;

  let from;
  let until;
  if (manual) {
    from = new Date(event.scanTokenValidFrom);
    until = new Date(event.scanTokenValidUntil);
  } else {
    from = DateTime.fromJSDate(new Date(event.dateDebut), { zone: timezone }).startOf('day').toJSDate();
    until = DateTime.fromJSDate(new Date(event.dateFin), { zone: timezone }).endOf('day').toJSDate();
  }

  const t = new Date(now).getTime();
  const status = t < from.getTime() ? 'PAS_ENCORE' : t > until.getTime() ? 'EXPIRE' : 'ACTIF';
  return { status, mode: manual ? 'MANUEL' : 'AUTO', from, until };
}

/** Test mode lets the link work outside its window until scanTestJusquA. */
export function isScanTestActive(event, now = new Date()) {
  return !!event.scanTestJusquA && new Date(now).getTime() < new Date(event.scanTestJusquA).getTime();
}

/** "3 nov. 2026 à 23:59" in the app time zone. */
export function formatScanDate(date, timezone = DEFAULT_TIMEZONE) {
  return DateTime.fromJSDate(new Date(date), { zone: timezone }).setLocale('fr').toFormat("d LLL yyyy 'à' HH:mm");
}

/** "10:32" in the app time zone (scan page: time of the last scan). */
export function formatScanTime(date, timezone = DEFAULT_TIMEZONE) {
  return DateTime.fromJSDate(new Date(date), { zone: timezone }).toFormat('HH:mm');
}

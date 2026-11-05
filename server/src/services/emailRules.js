/**
 * Pure rules of the email queue (unit tested).
 */

export const DEFAULT_LIMITE_PAR_MINUTE = 20;
// Retry delays after a temporary error: 1 min, 5 min, 15 min, then ECHEC.
export const RETRY_DELAYS_MS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000];

/**
 * How many emails may leave now for one organisateur.
 * `sentLastMinute` / `sentToday` include the ones being sent right now.
 */
export function emailQuota({ sentLastMinute, sentToday, limiteParMinute = DEFAULT_LIMITE_PAR_MINUTE, limiteParJour }) {
  const perMinute = Math.max(0, limiteParMinute - sentLastMinute);
  if (!limiteParJour) return perMinute;
  return Math.max(0, Math.min(perMinute, limiteParJour - sentToday));
}

/** Rough wait for `queued` emails at `limiteParMinute` (minutes, at least 1 when any). */
export function estimatedMinutes(queued, limiteParMinute = DEFAULT_LIMITE_PAR_MINUTE) {
  if (!queued) return 0;
  return Math.max(1, Math.ceil(queued / Math.max(1, limiteParMinute)));
}

/**
 * Kind of a nodemailer error:
 * AUTH (credentials refused → fail now, alert), TEMPORAIRE (network, 4xx →
 * retry later) or PERMANENT (5xx such as an unknown recipient → fail now).
 */
export function classifyEmailError(error) {
  const code = error?.code;
  const responseCode = Number(error?.responseCode) || 0;
  if (code === 'EAUTH' || [530, 534, 535].includes(responseCode)) return 'AUTH';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNRESET', 'ECONNREFUSED'].includes(code)) return 'TEMPORAIRE';
  if (responseCode >= 400 && responseCode < 500) return 'TEMPORAIRE';
  if (responseCode >= 500) return 'PERMANENT';
  return 'TEMPORAIRE';
}

/**
 * What to do after a failed attempt number `tentatives` (1 = first try):
 * { statut: 'EN_FILE', prochainEssai } to retry, or { statut: 'ECHEC' }.
 */
export function afterFailure({ erreurType, tentatives, now = new Date() }) {
  if (erreurType !== 'TEMPORAIRE') return { statut: 'ECHEC' };
  const delay = RETRY_DELAYS_MS[tentatives - 1];
  if (delay === undefined) return { statut: 'ECHEC' };
  return { statut: 'EN_FILE', prochainEssai: new Date(new Date(now).getTime() + delay) };
}

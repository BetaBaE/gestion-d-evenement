import { Event } from '../models/Event.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { env } from '../config/env.js';
import { getScanWindow, isScanTestActive, formatScanDate } from './scanWindow.js';

/**
 * Loads the event behind a public scan link and checks it may scan now.
 * Only the token and the window (or test mode) matter — not the event's
 * statut or inscriptionOuverte. Each refusal carries its own message and a
 * `details.code` so the scan page can show the real reason.
 */
export async function loadOpenScanEvent(scanToken, now = new Date()) {
  const event = await Event.findOne({ scanToken });
  if (!event) {
    throw new ApiError(403, 'Lien invalide ou remplacé.', { code: 'LIEN_INVALIDE' });
  }

  const window = getScanWindow(event, now, env.appTimezone);
  const modeTest = isScanTestActive(event, now);
  if (window.status !== 'ACTIF' && !modeTest) {
    if (window.status === 'PAS_ENCORE') {
      throw new ApiError(403, `Le scan ouvre le ${formatScanDate(window.from, env.appTimezone)}.`, {
        code: 'PAS_ENCORE',
        from: window.from,
      });
    }
    throw new ApiError(403, `Le scan est fermé depuis le ${formatScanDate(window.until, env.appTimezone)}.`, {
      code: 'EXPIRE',
      until: window.until,
    });
  }

  return { event, window, modeTest };
}

/** Admin view of the scan link: status, window, mode and time zone. */
export function describeScanLink(event, now = new Date()) {
  const window = getScanWindow(event, now, env.appTimezone);
  // Labels are formatted here: browsers' time-zone data can disagree with
  // the server's (seen with Africa/Casablanca), and the server decides.
  return {
    status: window.status,
    mode: window.mode,
    from: window.from,
    until: window.until,
    fromLabel: formatScanDate(window.from, env.appTimezone),
    untilLabel: formatScanDate(window.until, env.appTimezone),
    timezone: env.appTimezone,
    modeTest: isScanTestActive(event, now),
    scanTestJusquA: event.scanTestJusquA || null,
    scanTestJusquALabel: event.scanTestJusquA ? formatScanDate(event.scanTestJusquA, env.appTimezone) : null,
  };
}

/** Express middleware: scan responses must never be cached. */
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

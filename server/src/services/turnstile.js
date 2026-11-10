/**
 * Cloudflare Turnstile server-side check (siteverify).
 *
 * Pure apart from the HTTP call, which is injectable (`fetchImpl`) so the
 * rules are unit-tested without the network. Tokens are single-use and
 * expire after 300 s: Cloudflare enforces both (code
 * `timeout-or-duplicate`), and this module never caches a result.
 */

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const VERIFY_TIMEOUT_MS = 5000;

/** Cloudflare's own error codes meaning "our side failed", not "bad token". */
const OUTAGE_CODES = new Set(['internal-error']);

/**
 * @returns {Promise<{ ok: boolean, unavailable: boolean, codes: string[], hostname?: string, action?: string }>}
 *   `unavailable` is true when Cloudflare could not be reached or answered
 *   with a server error: the caller decides whether to fail closed.
 */
export async function verifyTurnstile({
  token,
  remoteIp,
  expectedAction,
  secret,
  allowedHostnames = [],
  fetchImpl = globalThis.fetch,
  timeoutMs = VERIFY_TIMEOUT_MS,
}) {
  if (!token || typeof token !== 'string') {
    return { ok: false, unavailable: false, codes: ['missing-input-response'] };
  }
  // Cloudflare refuses tokens over 2048 characters; don't send junk.
  if (token.length > 2048) {
    return { ok: false, unavailable: false, codes: ['invalid-input-response'] };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  let payload;
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status >= 500) {
      return { ok: false, unavailable: true, codes: [`http-${response.status}`] };
    }
    payload = await response.json();
  } catch (error) {
    const code = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'network-error';
    return { ok: false, unavailable: true, codes: [code] };
  }

  const codes = Array.isArray(payload?.['error-codes']) ? payload['error-codes'] : [];
  const result = { ok: false, unavailable: false, codes, hostname: payload?.hostname, action: payload?.action };

  if (payload?.success !== true) {
    if (codes.some((c) => OUTAGE_CODES.has(c))) result.unavailable = true;
    if (codes.length === 0) result.codes = ['verification-failed'];
    return result;
  }

  // Cloudflare's test secret keys answer hostname "example.com" and no
  // action; only those answers skip the two checks below. (A test key in
  // production is warned about at startup.)
  const testingKey = payload?.metadata?.result_with_testing_key === true;
  if (!testingKey) {
    const hostname = String(payload.hostname || '').toLowerCase();
    if (!allowedHostnames.includes(hostname)) {
      return { ...result, codes: ['hostname-mismatch'] };
    }
    if (expectedAction && payload.action !== expectedAction) {
      return { ...result, codes: ['action-mismatch'] };
    }
  }

  return { ...result, ok: true };
}

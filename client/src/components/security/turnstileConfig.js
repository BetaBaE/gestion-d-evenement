import { useEffect, useState } from 'react';
import { axiosClient } from '../../api/axiosClient.js';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

let pending = null;

/**
 * Whether the server wants the bot check (GET /api/public/config), read once
 * per page load. If the call fails we assume it is on: the server decides
 * anyway, and a missing token is just refused.
 */
function loadConfig() {
  pending ??= axiosClient
    .get('/public/config')
    .then(({ data }) => ({ enabled: !!data?.turnstile?.enabled }))
    .catch(() => {
      pending = null;
      return { enabled: true };
    });
  return pending;
}

/**
 * { loading, enabled, siteKey, misconfigured }
 * `enabled` means a token must be sent; `misconfigured` means the server
 * wants one but this build has no VITE_TURNSTILE_SITE_KEY.
 */
export function useTurnstileConfig() {
  const [state, setState] = useState({ loading: true, enabled: false });
  useEffect(() => {
    let cancelled = false;
    loadConfig().then((config) => {
      if (!cancelled) setState({ loading: false, ...config });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { ...state, siteKey: SITE_KEY, misconfigured: !state.loading && state.enabled && !SITE_KEY };
}

/** French message for the server's bot-check error codes, or null. */
export function captchaErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.code === 'CAPTCHA_INVALIDE' || data?.code === 'CAPTCHA_INDISPONIBLE') return data.message;
  return null;
}

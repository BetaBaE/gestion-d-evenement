import { env } from '../config/env.js';
import { verifyTurnstile } from '../services/turnstile.js';

export const CAPTCHA_INVALIDE = {
  code: 'CAPTCHA_INVALIDE',
  message: 'Vérification anti-robot échouée. Merci de réessayer.',
};

export const CAPTCHA_INDISPONIBLE = {
  code: 'CAPTCHA_INDISPONIBLE',
  message: 'Le service de vérification est momentanément indisponible. Réessayez dans un instant.',
};

/**
 * The visitor's IP, as Express computes it from the configured "trust proxy"
 * hops (Vercel / Nginx): X-Forwarded-For is only believed for those hops, so
 * a client can't spoof it. Only sent to Cloudflare as a hint.
 */
export function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || undefined;
}

function readToken(req) {
  const fromBody = req.body && typeof req.body.turnstileToken === 'string' ? req.body.turnstileToken : '';
  return fromBody || req.get?.('cf-turnstile-response') || '';
}

/**
 * Builds the middleware; dependencies are injectable for tests.
 * `action` is the widget action the token must carry ('login' | 'inscription').
 */
export function createRequireTurnstile({ config = env.turnstile, verify = verifyTurnstile, logger = console } = {}) {
  return function requireTurnstile(action) {
    return async function turnstileMiddleware(req, res, next) {
      if (!config.enabled) return next();

      const ip = clientIp(req);
      const token = readToken(req);
      let result;
      try {
        result = await verify({
          token,
          remoteIp: ip,
          expectedAction: action,
          secret: config.secretKey,
          allowedHostnames: config.allowedHostnames,
        });
      } catch (error) {
        result = { ok: false, unavailable: true, codes: ['verify-threw'] };
        logger.error('[turnstile] verification crashed:', error?.message || error);
      }

      if (result.ok) return next();

      // Never log the token itself.
      const context = `action=${action} ip=${ip || '?'} codes=${(result.codes || []).join(',') || '-'}`;

      if (result.unavailable) {
        if (action === 'login' && config.loginFailOpen) {
          logger.warn(`[turnstile] Cloudflare unreachable, login let through (TURNSTILE_LOGIN_FAIL_OPEN): ${context}`);
          return next();
        }
        logger.error(`[turnstile] Cloudflare unreachable, request refused: ${context}`);
        return res.status(503).json(CAPTCHA_INDISPONIBLE);
      }

      logger.warn(`[turnstile] check failed: ${context}`);
      return res.status(403).json(CAPTCHA_INVALIDE);
    };
  };
}

export const requireTurnstile = createRequireTurnstile();

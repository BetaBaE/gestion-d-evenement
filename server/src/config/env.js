import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const clientUrlRaw = required('CLIENT_URL');

export const env = {
  port: process.env.PORT || '4000',
  mongodbUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // CLIENT_URL may be a comma-separated list (e.g. localhost + a LAN IP) so
  // the dev server can be reached from other devices without breaking
  // localhost access for the developer's own machine.
  clientUrl: clientUrlRaw,
  clientUrls: clientUrlRaw.split(',').map((url) => url.trim()).filter(Boolean),
  publicAppUrl: process.env.PUBLIC_APP_URL || clientUrlRaw.split(',')[0].trim(),
  publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || '4000'}/api`,
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || 'Inscriptions <no-reply@example.com>',
  // Day boundaries (scan window, "end of day") are computed in this zone.
  appTimezone: process.env.APP_TIMEZONE || 'Africa/Casablanca',
  superAdmin: {
    email: process.env.SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD,
  },
  emailSettingsEncryptionKey: process.env.EMAIL_SETTINGS_ENCRYPTION_KEY,
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB) || 5,
  isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
  // Express "trust proxy": how many proxy hops sit in front of the API, so
  // req.ip is the visitor's address. Vercel = 1; behind Nginx/Caddy set
  // TRUST_PROXY=1 (or "loopback"). Unset elsewhere: X-Forwarded-For ignored.
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY ?? (process.env.VERCEL ? '1' : '')),
  turnstile: turnstileConfig(),
};

function parseTrustProxy(value) {
  const v = String(value).trim();
  if (!v || v === 'false') return false;
  if (v === 'true') return true;
  return /^\d+$/.test(v) ? Number(v) : v;
}

/** Cloudflare Turnstile (bot check on login and the public registration form). */
function turnstileConfig() {
  // Off unless explicitly switched on, so deploying before the keys exist locks nobody out.
  const enabled = process.env.TURNSTILE_ENABLED === 'true';
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '';
  if (enabled && !secretKey) {
    throw new Error('TURNSTILE_ENABLED=true but TURNSTILE_SECRET_KEY is empty.');
  }
  return {
    enabled,
    secretKey,
    allowedHostnames: (process.env.TURNSTILE_ALLOWED_HOSTNAMES || 'event.atner.ma,gestion-d-evenement.vercel.app,localhost')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
    // Emergency switch: a Cloudflare OUTAGE (never an invalid token) lets a login through.
    loginFailOpen: process.env.TURNSTILE_LOGIN_FAIL_OPEN === 'true',
  };
}

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
};

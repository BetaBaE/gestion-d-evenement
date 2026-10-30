import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: process.env.PORT || '4000',
  mongodbUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientUrl: required('CLIENT_URL'),
  publicAppUrl: process.env.PUBLIC_APP_URL || process.env.CLIENT_URL,
  publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || '4000'}/api`,
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || 'Inscriptions <no-reply@example.com>',
  superAdmin: {
    email: process.env.SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD,
  },
  emailSettingsEncryptionKey: process.env.EMAIL_SETTINGS_ENCRYPTION_KEY,
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB) || 5,
};

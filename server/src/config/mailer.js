import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporterPromise = null;
let usingEthereal = false;

async function buildTransporter() {
  if (env.smtp.user && env.smtp.pass) {
    return nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  usingEthereal = true;
  console.log('No SMTP credentials configured — using an Ethereal test account for emails.');
  console.log(`Ethereal inbox: https://ethereal.email/login (user: ${testAccount.user})`);

  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

export function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
}

export function isUsingEthereal() {
  return usingEthereal;
}

export { getTestMessageUrl } from 'nodemailer';

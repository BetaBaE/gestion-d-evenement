// Vercel serverless entry: the whole Express API as one function, reached
// through the /api/* rewrite in vercel.json (same domain as the front end,
// so the session cookie and images work exactly as with the dev proxy).
import { app } from '../server/src/app.js';
import { connectDb } from '../server/src/config/db.js';

// One MongoDB connection per warm function instance, reused between requests.
let connection = null;

export default async function handler(req, res) {
  if (!connection) {
    connection = connectDb().catch((error) => {
      connection = null;
      throw error;
    });
  }
  await connection;
  return app(req, res);
}

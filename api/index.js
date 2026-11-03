// Vercel serverless entry: the whole Express API as one function, reached
// through the /api/* rewrite in vercel.json (same domain as the front end,
// so the session cookie and images work exactly as with the dev proxy).

// One app + MongoDB connection per warm function instance, reused between
// requests. Loaded lazily so a startup failure (missing environment
// variable, database unreachable…) is answered with a readable message
// instead of Vercel's bare FUNCTION_INVOCATION_FAILED.
let ready = null;

async function start() {
  const { app } = await import('../server/src/app.js');
  const { connectDb } = await import('../server/src/config/db.js');
  await connectDb();
  return app;
}

/** Never echo credentials from a connection string. */
function safeMessage(error) {
  return String(error?.message || error).replace(/mongodb(\+srv)?:\/\/[^@\s]+@/g, 'mongodb$1://***@').slice(0, 500);
}

export default async function handler(req, res) {
  if (!ready) {
    ready = start().catch((error) => {
      ready = null;
      throw error;
    });
  }
  let app;
  try {
    app = await ready;
  } catch (error) {
    console.error('API startup failed:', error);
    const hint = /ServerSelection|ECONNREFUSED|ENOTFOUND|querySrv|whitelist|IP|Mongo/i.test(String(error?.name) + String(error?.message))
      ? "MongoDB injoignable : vérifiez MONGODB_URI et, dans Atlas → Network Access, l'autorisation de 0.0.0.0/0."
      : "Vérifiez les variables d'environnement du projet Vercel.";
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ message: "L'API n'a pas pu démarrer.", detail: `${error?.name || 'Error'}: ${safeMessage(error)}`, conseil: hint }));
    return;
  }
  return app(req, res);
}

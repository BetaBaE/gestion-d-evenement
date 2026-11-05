import { app } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { startWorkerLoop } from './jobs/worker.js';

async function main() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
  // Long-running server: background jobs and the email queue run continuously.
  startWorkerLoop();
}

// A stray rejected promise (one request, one job step) must not take the whole
// API down — under node --watch the server then stayed off until a file changed.
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

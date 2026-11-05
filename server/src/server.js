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

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

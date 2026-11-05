import { runJobStep } from './jobQueue.js';
import { cleanupExpiredFiles } from '../services/fileStore.js';
import './handlers/index.js';

/**
 * Background work, in time-boxed steps:
 * - long-running server (local, VPS): startWorkerLoop() runs a step every few seconds;
 * - serverless (Vercel): kickWorkAfterRequest() runs a step after API responses
 *   (waitUntil), and the "Tâches" panel runs one on each poll.
 * Other modules add their own step (e.g. the email queue) with registerWorkStep.
 */
const steps = [];
let running = null;
let lastCleanup = 0;
const MIN_STEP_MS = 3000;

export function registerWorkStep(fn) {
  steps.push(fn);
}

async function doWork(budgetMs) {
  const deadline = Date.now() + budgetMs;
  for (const step of steps) {
    try {
      await step(deadline);
    } catch (error) {
      console.error('[worker] step failed:', error);
    }
  }
  // Jobs: keep going while there is work and enough time for a batch.
  while (deadline - Date.now() > MIN_STEP_MS) {
    // eslint-disable-next-line no-await-in-loop
    const didWork = await runJobStep(deadline);
    if (!didWork) break;
  }
  if (Date.now() - lastCleanup > 10 * 60 * 1000) {
    lastCleanup = Date.now();
    await cleanupExpiredFiles().catch((error) => console.error('[worker] cleanup failed:', error));
  }
}

/** One step at a time per process; concurrent callers share the running one. */
export function runPendingWork({ budgetMs = 8000 } = {}) {
  if (!running) {
    running = doWork(budgetMs).finally(() => {
      running = null;
    });
  }
  return running;
}

export function startWorkerLoop(intervalMs = 3000) {
  const tick = () => runPendingWork({ budgetMs: Math.max(intervalMs - 500, MIN_STEP_MS + 1000) }).catch((e) => console.error('[worker]', e));
  setInterval(tick, intervalMs);
  tick();
  console.log(`Background worker started (every ${intervalMs / 1000} s).`);
}

let lastKick = 0;
/** Serverless: after a response, keep the function alive a bit to make progress. */
export async function kickWorkAfterRequest() {
  if (Date.now() - lastKick < 3000) return;
  lastKick = Date.now();
  const { waitUntil } = await import('@vercel/functions');
  waitUntil(runPendingWork({ budgetMs: 25000 }));
}

import { Job } from '../models/Job.js';
import { ApiError } from '../middlewares/errorHandler.js';

/**
 * MongoDB-backed job queue processed in short, time-boxed steps — works the
 * same in a long-running server (loop) and on serverless (a step after
 * requests / on each "Tâches" poll).
 *
 * A handler: { libelle(job), batchSize, prepare?(job), processBatch(job, ids)
 * → [{ id, statut: 'ok'|'ignore'|'echec', erreur? }], finalize?(job) }.
 * processBatch must be idempotent: after a crash the last batch runs again.
 */
const handlers = new Map();
const LOCK_MS = 60 * 1000;
const MAX_REPRISES_SANS_PROGRES = 5;

export function registerJobHandler(type, handler) {
  handlers.set(type, handler);
}

export function getJobHandler(type) {
  return handlers.get(type);
}

export const JOB_TERMINAL = ['TERMINE', 'TERMINE_AVEC_ERREURS', 'ECHEC', 'ANNULE'];

/** Creates a job, or returns the existing one for the same requestId (double click). */
export async function createJob({ type, organisateurId, eventId, createdBy, requestId, params = {}, items = [], libelle }) {
  if (!handlers.has(type)) throw new ApiError(400, `Type de tâche inconnu : ${type}`);
  const existing = await Job.findOne({ createdBy, requestId });
  if (existing) return { job: existing, created: false };
  try {
    const job = await Job.create({ type, organisateurId, eventId, createdBy, requestId, params, items, total: items.length, libelle });
    return { job, created: true };
  } catch (error) {
    if (error.code === 11000) return { job: await Job.findOne({ createdBy, requestId }), created: false };
    throw error;
  }
}

async function claimJob(now) {
  return Job.findOneAndUpdate(
    { statut: { $in: ['EN_ATTENTE', 'EN_COURS'] }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
    [
      {
        $set: {
          // Claimed while EN_COURS with an *expired* lock = the previous worker
          // died mid-step (crash, restart, timeout). A released lock (null) is
          // just a step that ran out of time and doesn't count.
          reprises: {
            $cond: [{ $and: [{ $eq: ['$statut', 'EN_COURS'] }, { $ne: ['$lockedUntil', null] }] }, { $add: ['$reprises', 1] }, '$reprises'],
          },
          statut: 'EN_COURS',
          lockedUntil: new Date(now.getTime() + LOCK_MS),
          startedAt: { $ifNull: ['$startedAt', now] },
        },
      },
    ],
    { sort: { createdAt: 1 }, returnDocument: 'after', updatePipeline: true },
  );
}

async function finishJob(job, handler) {
  if (handler.finalize) await handler.finalize(job);
  const fresh = await Job.findById(job._id);
  const statut = fresh.echecs.length > 0 ? 'TERMINE_AVEC_ERREURS' : 'TERMINE';
  await Job.updateOne({ _id: job._id, statut: 'EN_COURS' }, { $set: { statut, finishedAt: new Date(), lockedUntil: null } });
}

/**
 * Runs one job as far as possible before `deadline` (ms timestamp).
 * Returns true if a job was processed (more work may remain).
 */
export async function runJobStep(deadline) {
  const job = await claimJob(new Date());
  if (!job) return false;
  const handler = handlers.get(job.type);
  if (!handler) {
    await Job.updateOne({ _id: job._id }, { $set: { statut: 'ECHEC', erreur: 'Type de tâche inconnu.', finishedAt: new Date(), lockedUntil: null } });
    return true;
  }
  if (job.reprises > MAX_REPRISES_SANS_PROGRES) {
    await Job.updateOne(
      { _id: job._id },
      { $set: { statut: 'ECHEC', erreur: 'La tâche a été interrompue trop de fois (redémarrages).', finishedAt: new Date(), lockedUntil: null } },
    );
    return true;
  }

  try {
    if (!job.etat?.prepare && handler.prepare) {
      await handler.prepare(job);
      await Job.updateOne({ _id: job._id }, { $set: { 'etat.prepare': true } });
      job.etat = { ...(job.etat || {}), prepare: true };
    }
    let current = await Job.findById(job._id);
    const batchSize = handler.batchSize || 10;
    while (current.position < current.items.length && Date.now() < deadline) {
      if (current.statut === 'ANNULE') return true;
      const ids = current.items.slice(current.position, current.position + batchSize);
      const results = await handler.processBatch(current, ids);
      const ok = results.filter((r) => r.statut === 'ok').length;
      const ignore = results.filter((r) => r.statut === 'ignore').length;
      const echecs = results.filter((r) => r.statut === 'echec').map((r) => ({ participantId: r.id, erreur: r.erreur }));
      current = await Job.findOneAndUpdate(
        { _id: job._id, position: current.position },
        {
          $inc: { position: ids.length, traites: ids.length, reussis: ok, ignores: ignore },
          $push: { echecs: { $each: echecs } },
          // Progress made: reset the crash counter and extend the lock.
          $set: { reprises: 0, lockedUntil: new Date(Date.now() + LOCK_MS) },
        },
        { returnDocument: 'after' },
      );
      if (!current) return true; // cancelled or taken over meanwhile
    }
    if (current.position >= current.items.length) {
      await finishJob(current, handler);
    } else {
      // Out of time: release so the next step continues right away.
      await Job.updateOne({ _id: job._id, statut: 'EN_COURS' }, { $set: { lockedUntil: null } });
    }
  } catch (error) {
    console.error(`[jobs] ${job.type} ${job._id} step failed:`, error);
    await Job.updateOne({ _id: job._id }, { $set: { erreur: error.message, lockedUntil: null }, $inc: { reprises: 1 } });
  }
  return true;
}

export async function hasPendingJobs() {
  return !!(await Job.exists({ statut: { $in: ['EN_ATTENTE', 'EN_COURS'] } }));
}

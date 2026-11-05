import { z } from 'zod';
import mongoose from 'mongoose';
import { Job } from '../models/Job.js';
import { Event } from '../models/Event.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { createJob, JOB_TERMINAL } from '../jobs/jobQueue.js';
import { runPendingWork, hasWorkerLoop } from '../jobs/worker.js';
import { findFile, openFileStream } from '../services/fileStore.js';

const LIST_FIELDS = '-items -etat -params';

async function recentJobs(organisateurId) {
  const jobs = await Job.find({ organisateurId }).select(LIST_FIELDS).sort({ createdAt: -1 }).limit(20).lean();
  const eventIds = [...new Set(jobs.map((j) => String(j.eventId)).filter(Boolean))];
  const events = await Event.find({ _id: { $in: eventIds } }).select('titre').lean();
  const titres = new Map(events.map((e) => [String(e._id), e.titre]));
  return jobs.map((j) => ({
    ...j,
    id: String(j._id),
    eventTitre: titres.get(String(j.eventId)) || null,
    echecs: j.echecs.slice(0, 50),
    nbEchecs: j.echecs.length,
    termine: JOB_TERMINAL.includes(j.statut),
  }));
}

/** "Tâches" panel: the organisateur's latest jobs. */
export async function listJobs(req, res, next) {
  try {
    res.json({ items: await recentJobs(req.organisateurId) });
  } catch (error) {
    next(error);
  }
}

/**
 * Same list, after running a worker step (≈ 8 s). The panel calls this while
 * jobs are running: on serverless hosting it is what moves them forward. A
 * server with its own worker loop answers at once (no waiting on a step).
 */
export async function advanceJobs(req, res, next) {
  try {
    if (!hasWorkerLoop()) await runPendingWork({ budgetMs: 8000 });
    res.json({ items: await recentJobs(req.organisateurId) });
  } catch (error) {
    next(error);
  }
}

async function ownJob(req) {
  if (!mongoose.isValidObjectId(req.params.jobId)) throw new ApiError(404, 'Tâche introuvable.');
  const job = await Job.findOne({ _id: req.params.jobId, organisateurId: req.organisateurId });
  if (!job) throw new ApiError(404, 'Tâche introuvable.');
  return job;
}

export async function cancelJob(req, res, next) {
  try {
    const job = await ownJob(req);
    if (JOB_TERMINAL.includes(job.statut)) throw new ApiError(409, 'Cette tâche est déjà terminée.');
    await Job.updateOne({ _id: job._id }, { $set: { statut: 'ANNULE', finishedAt: new Date(), lockedUntil: null } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

/** "Réessayer les échecs": a new job of the same kind, on the failed participants only. */
export async function retryJobFailures(req, res, next) {
  try {
    const { requestId } = z.object({ requestId: z.string().min(8).max(64) }).parse(req.body);
    const job = await ownJob(req);
    const ids = [...new Set(job.echecs.map((e) => String(e.participantId)).filter(Boolean))];
    if (ids.length === 0) throw new ApiError(409, 'Aucun échec à réessayer.');
    const { job: retry } = await createJob({
      type: job.type,
      organisateurId: job.organisateurId,
      eventId: job.eventId,
      createdBy: req.user.sub,
      requestId,
      params: job.params,
      items: ids.map((id) => new mongoose.Types.ObjectId(id)),
      libelle: `${job.libelle || job.type} (réessai)`,
    });
    res.status(201).json({ id: String(retry._id) });
  } catch (error) {
    next(error);
  }
}

export async function downloadJobFile(req, res, next) {
  try {
    const job = await ownJob(req);
    const fichier = job.resultat?.fichiers?.find((f) => String(f.fileId) === req.params.fileId);
    if (!fichier) throw new ApiError(404, 'Fichier introuvable.');
    const meta = await findFile(fichier.fileId);
    if (!meta) throw new ApiError(410, 'Ce fichier a expiré (conservé 24 h). Relancez l’action pour le générer à nouveau.');
    const ascii = fichier.nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_');
    res.set('Content-Type', meta.metadata?.contentType || 'application/octet-stream');
    res.set('Content-Length', String(meta.length));
    res.set('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fichier.nom)}`);
    openFileStream(fichier.fileId).on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
}

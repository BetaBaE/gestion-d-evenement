import { z } from 'zod';
import mongoose from 'mongoose';
import { Participant } from '../models/Participant.js';
import { Scan } from '../models/Scan.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { BULK_ACTIONS, summarize } from '../services/bulkRules.js';
import { normalizeSelection, resolveSelection, MAX_SELECTION, tooMany } from '../services/participantFilter.js';
import { emailSummary } from '../services/emailQueue.js';
import { estimatedMinutes } from '../services/emailRules.js';
import { createJob } from '../jobs/jobQueue.js';

const bodySchema = z.object({
  action: z.enum(Object.keys(BULK_ACTIONS)),
  selection: z.unknown(),
  options: z
    .object({
      categorieId: z.string().optional(),
      type: z.enum(['CONFIRMATION', 'BADGE']).optional(),
      ordre: z.enum(['ORGANISME_NOM', 'NOM', 'CATEGORIE_NOM', 'INSCRIPTION']).optional(),
      seulementJamaisImprimes: z.boolean().optional(),
      inclureNonValides: z.boolean().optional(),
      separateurs: z.boolean().optional(),
      planche: z.boolean().optional(),
      traitsDeCoupe: z.boolean().optional(),
    })
    .default({}),
});

const JOB_TYPES = { EXPORTER: 'EXPORT_PARTICIPANTS', IMPRIMER: 'PRINT_BADGES' };

/** Parses the request, resolves the selection and computes the eligibility summary. */
async function prepare(req) {
  const { action, selection: rawSelection, options } = bodySchema.parse(req.body);
  const selection = normalizeSelection(rawSelection);
  if (selection.erreur) throw new ApiError(400, selection.erreur);

  if (action === 'CHANGER_CATEGORIE') {
    if (!options.categorieId || !mongoose.isValidObjectId(options.categorieId)) throw new ApiError(400, 'Choisissez la nouvelle catégorie.');
    const categorie = await CategorieEvent.exists({ _id: options.categorieId, eventId: req.event._id });
    if (!categorie) throw new ApiError(400, "Cette catégorie n'appartient pas à l'événement.");
  }
  if (action === 'RENVOYER_EMAIL' && !options.type) throw new ApiError(400, "Choisissez l'email à renvoyer.");

  const ids = await resolveSelection(req.event._id, selection);
  // Filter mode stops reading at MAX_SELECTION + 1, so the exact count is unknown past the limit.
  if (ids.length > MAX_SELECTION) throw new ApiError(400, tooMany(`Plus de ${MAX_SELECTION}`));
  if (ids.length === 0) throw new ApiError(400, 'Aucun participant ne correspond à la sélection.');

  const participants = await Participant.find({ _id: { $in: ids } }).select('statut email nbImpressionsBadge categorieId').lean();
  const scannes = action === 'SUPPRIMER' ? new Set((await Scan.distinct('participantId', { participantId: { $in: ids } })).map(String)) : undefined;
  const summary = summarize(action, participants, { options, scannes });

  if (summary.emails > 0) {
    const queue = await emailSummary(req.event);
    summary.expediteur = queue.expediteur;
    summary.minutesEnvoi = estimatedMinutes(queue.enFile + summary.emails, queue.limiteParMinute);
    summary.limiteParMinute = queue.limiteParMinute;
  }
  summary.libelle = BULK_ACTIONS[action].libelle;
  summary.verbe = BULK_ACTIONS[action].verbe;
  return { action, options, ids, summary };
}

/** Confirmation dialog: "37 sélectionnés → 34 seront validés · 3 déjà validés (ignorés)…". */
export async function previewBulkAction(req, res, next) {
  try {
    const { summary } = await prepare(req);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

/** Starts the job (same requestId twice = same job). The dialog closes; progress is in "Tâches". */
export async function runBulkAction(req, res, next) {
  try {
    const { requestId, confirmation } = z.object({ requestId: z.string().min(8).max(64), confirmation: z.number().int().optional() }).parse(req.body);
    const { action, options, ids, summary } = await prepare(req);
    if (summary.eligibles === 0) throw new ApiError(409, 'Aucun participant de la sélection n’est concerné par cette action.');
    if (action === 'SUPPRIMER' && confirmation !== summary.eligibles) {
      throw new ApiError(400, `Pour confirmer la suppression, saisissez le nombre de participants supprimés (${summary.eligibles}).`);
    }
    const { job } = await createJob({
      type: JOB_TYPES[action] || 'BULK_PARTICIPANTS',
      organisateurId: req.organisateurId,
      eventId: req.event._id,
      createdBy: req.user.sub,
      requestId,
      params: { action, options, userId: req.user.sub },
      items: ids,
      libelle: `${summary.libelle} — ${ids.length} participant${ids.length > 1 ? 's' : ''}`,
    });
    res.status(201).json({ id: String(job._id), statut: job.statut });
  } catch (error) {
    next(error);
  }
}

import { z } from 'zod';
import mongoose from 'mongoose';
import { Participant } from '../models/Participant.js';
import { Scan } from '../models/Scan.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { BULK_ACTIONS, eligibility, summarize } from '../services/bulkRules.js';
import { sortForPrint } from '../services/printPlan.js';
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
  if (action === 'IMPRIMER' && !req.event.badge?.elements?.length) {
    throw new ApiError(400, "Cet événement n'a pas encore de modèle de badge (onglet Badge).");
  }

  const ids = await resolveSelection(req.event._id, selection);
  // Filter mode stops reading at MAX_SELECTION + 1, so the exact count is unknown past the limit.
  if (ids.length > MAX_SELECTION) throw new ApiError(400, tooMany(`Plus de ${MAX_SELECTION}`));
  if (ids.length === 0) throw new ApiError(400, 'Aucun participant ne correspond à la sélection.');

  const participants = await Participant.find({ _id: { $in: ids } })
    .select('statut email nbImpressionsBadge categorieId invitedOrganismId nom prenom createdAt')
    .lean();
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
  return { action, options, ids, participants, summary };
}

/** Badges to print, in print order: the job renders them in this sequence. */
async function printOrder(participants, options) {
  const eligibles = participants.filter((p) => eligibility('IMPRIMER', p, { options }).ok);
  const [organismes, categories] = await Promise.all([
    InvitedOrganism.find({ _id: { $in: [...new Set(eligibles.map((p) => String(p.invitedOrganismId)))] } }).select('nom').lean(),
    CategorieEvent.find({ _id: { $in: [...new Set(eligibles.map((p) => String(p.categorieId)))] } }).select('nom').lean(),
  ]);
  const names = {
    organisme: new Map(organismes.map((o) => [String(o._id), o.nom])),
    categorie: new Map(categories.map((c) => [String(c._id), c.nom])),
  };
  return sortForPrint(eligibles, options.ordre, names).map((p) => p._id);
}

const GROUPS_LIMIT = 300;

/**
 * Counts behind the group shortcuts: per organisme ("12 inscrits · 8 en
 * attente"), per catégorie, and the form submissions grouped by
 * inscriptionGroupeId (most recent first).
 */
export async function getGroupCounts(req, res, next) {
  try {
    const eventId = req.event._id;
    const counts = (key) => [
      { $match: { eventId } },
      {
        $group: {
          _id: `$${key}`,
          inscrits: { $sum: 1 },
          enAttente: { $sum: { $cond: [{ $eq: ['$statut', 'EN_ATTENTE'] }, 1, 0] } },
          valides: { $sum: { $cond: [{ $eq: ['$statut', 'VALIDE'] }, 1, 0] } },
          jamaisImprimes: { $sum: { $cond: [{ $and: [{ $eq: ['$statut', 'VALIDE'] }, { $lte: [{ $ifNull: ['$nbImpressionsBadge', 0] }, 0] }] }, 1, 0] } },
        },
      },
    ];
    const [organismes, categories, inscriptions] = await Promise.all([
      Participant.aggregate(counts('invitedOrganismId')),
      Participant.aggregate(counts('categorieId')),
      Participant.aggregate([
        { $match: { eventId, inscriptionGroupeId: { $nin: [null, ''] } } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$inscriptionGroupeId',
            n: { $sum: 1 },
            enAttente: { $sum: { $cond: [{ $eq: ['$statut', 'EN_ATTENTE'] }, 1, 0] } },
            valides: { $sum: { $cond: [{ $eq: ['$statut', 'VALIDE'] }, 1, 0] } },
            organismeId: { $first: '$invitedOrganismId' },
            soumisLe: { $min: '$createdAt' },
            noms: { $push: { $concat: ['$prenom', ' ', '$nom'] } },
          },
        },
        { $sort: { soumisLe: -1 } },
        { $limit: GROUPS_LIMIT },
      ]),
    ]);
    const byId = (rows) => Object.fromEntries(rows.map(({ _id, ...c }) => [String(_id), c]));
    res.json({
      organismes: byId(organismes),
      categories: byId(categories),
      inscriptions: inscriptions.map(({ _id, noms, ...g }) => ({ id: _id, ...g, noms: noms.slice(0, 6) })),
    });
  } catch (error) {
    next(error);
  }
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
    const { action, options, ids, participants, summary } = await prepare(req);
    if (summary.eligibles === 0) throw new ApiError(409, 'Aucun participant de la sélection n’est concerné par cette action.');
    if (action === 'SUPPRIMER' && confirmation !== summary.eligibles) {
      throw new ApiError(400, `Pour confirmer la suppression, saisissez le nombre de participants supprimés (${summary.eligibles}).`);
    }
    const items = action === 'IMPRIMER' ? await printOrder(participants, options) : ids;
    const libelle =
      action === 'IMPRIMER'
        ? `Impression — ${items.length} badge${items.length > 1 ? 's' : ''}`
        : `${summary.libelle} — ${ids.length} participant${ids.length > 1 ? 's' : ''}`;
    const { job } = await createJob({
      type: JOB_TYPES[action] || 'BULK_PARTICIPANTS',
      organisateurId: req.organisateurId,
      eventId: req.event._id,
      createdBy: req.user.sub,
      requestId,
      params: { action, options, userId: req.user.sub },
      items,
      libelle,
    });
    res.status(201).json({ id: String(job._id), statut: job.statut });
  } catch (error) {
    next(error);
  }
}

import mongoose from 'mongoose';
import { Scan } from '../models/Scan.js';
import { EmailLog } from '../models/EmailLog.js';
import { Participant } from '../models/Participant.js';

// Scans recorded in test mode never count as presence.
const REAL_SCAN = { test: { $ne: true } };
const STATUTS = ['EN_ATTENTE', 'VALIDE', 'REFUSE'];
const SOURCES = ['FORMULAIRE', 'MANUEL'];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toObjectId = (id) => (mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : null);

/**
 * MongoDB filter for an event's participants from list/export query params:
 * search (nom, prénom, email, fonction), invitedOrganismId, categorieId,
 * statut (validation) and presence ('present' | 'absent': at least one real
 * scan or none). Invalid values match nothing instead of erroring.
 */
export async function buildParticipantFilter(eventId, query = {}) {
  const filter = { eventId };
  const none = { _id: null };

  if (query.statut) {
    if (!STATUTS.includes(query.statut)) return none;
    filter.statut = query.statut;
  }
  if (query.categorieId) {
    const id = toObjectId(query.categorieId);
    if (!id) return none;
    filter.categorieId = id;
  }
  if (query.invitedOrganismId) {
    const id = toObjectId(query.invitedOrganismId);
    if (!id) return none;
    filter.invitedOrganismId = id;
  }
  const search = String(query.search || query.q || '').trim();
  if (search) {
    // User text is escaped: "(" or "+" no longer break the query.
    const regex = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
    filter.$or = [{ nom: regex }, { prenom: regex }, { email: regex }, { fonction: regex }];
  }
  // Quick filters
  if (query.inscriptionGroupeId) filter.inscriptionGroupeId = String(query.inscriptionGroupeId).slice(0, 40);
  if (query.source) {
    if (!SOURCES.includes(query.source)) return none;
    filter.source = query.source;
  }
  if (query.badge === 'jamais') filter.nbImpressionsBadge = { $in: [0, null] };
  if (query.email === 'nonEnvoye') {
    // Validé but the badge email never left.
    if (filter.statut && filter.statut !== 'VALIDE') return none;
    filter.statut = 'VALIDE';
    filter.badgeEnvoyeLe = null;
  }

  // Conditions on _id are combined (presence and email failures can both apply).
  const idConditions = [];
  if (query.presence === 'present' || query.presence === 'absent') {
    const presentIds = await Scan.distinct('participantId', { eventId, ...REAL_SCAN });
    idConditions.push({ _id: query.presence === 'present' ? { $in: presentIds } : { $nin: presentIds } });
  }
  if (query.email === 'echec') {
    const failedIds = await EmailLog.distinct('participantId', { eventId, statut: 'ECHEC' });
    idConditions.push({ _id: { $in: failedIds } });
  }
  if (idConditions.length === 1) Object.assign(filter, idConditions[0]);
  if (idConditions.length > 1) filter.$and = idConditions;
  return filter;
}

export const MAX_SELECTION = 2000;

/**
 * Validates a bulk-action selection (pure): either explicit ids
 * ({ mode: 'ids', ids }) or "everything matching the filters"
 * ({ mode: 'filtre', filtre }), resolved server-side at execution time.
 * Returns { mode, ids } | { mode, filtre }, or { erreur }.
 */
export function normalizeSelection(selection) {
  if (!selection || typeof selection !== 'object') return { erreur: 'Sélection manquante.' };
  if (selection.mode === 'ids') {
    const ids = [...new Set((selection.ids || []).map(String))];
    if (ids.length === 0) return { erreur: 'Aucun participant sélectionné.' };
    if (ids.some((id) => !mongoose.isValidObjectId(id))) return { erreur: 'Sélection invalide.' };
    if (ids.length > MAX_SELECTION) return { erreur: tooMany(ids.length) };
    return { mode: 'ids', ids };
  }
  if (selection.mode === 'filtre') {
    const allowed = ['search', 'invitedOrganismId', 'categorieId', 'statut', 'presence', 'inscriptionGroupeId', 'source', 'badge', 'email'];
    const filtre = Object.fromEntries(Object.entries(selection.filtre || {}).filter(([k, v]) => allowed.includes(k) && v !== undefined && v !== null && v !== ''));
    return { mode: 'filtre', filtre };
  }
  return { erreur: 'Sélection invalide.' };
}

export function tooMany(count) {
  return `${count} participants sélectionnés : une action groupée est limitée à ${MAX_SELECTION} participants. Affinez les filtres.`;
}

/** Participant ids of a normalized selection, limited to the event (server-side resolution). */
export async function resolveSelection(eventId, selection) {
  if (selection.mode === 'ids') {
    const ids = selection.ids.map((id) => new mongoose.Types.ObjectId(id));
    return (await Participant.find({ eventId, _id: { $in: ids } }).select('_id').lean()).map((p) => p._id);
  }
  const filter = await buildParticipantFilter(eventId, selection.filtre);
  return (await Participant.find(filter).select('_id').limit(MAX_SELECTION + 1).lean()).map((p) => p._id);
}

/** { [participantId]: { present, premiereEntree, nbEntrees } } for the given participants. */
export async function presenceByParticipant(eventId, participantIds) {
  if (participantIds.length === 0) return {};
  const rows = await Scan.aggregate([
    { $match: { eventId, participantId: { $in: participantIds }, ...REAL_SCAN } },
    { $group: { _id: '$participantId', premiereEntree: { $min: '$horodatage' }, derniereEntree: { $max: '$horodatage' }, nbEntrees: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach((row) => {
    map[String(row._id)] = { present: true, premiereEntree: row.premiereEntree, derniereEntree: row.derniereEntree, nbEntrees: row.nbEntrees };
  });
  return map;
}

export const ABSENT = { present: false, premiereEntree: null, derniereEntree: null, nbEntrees: 0 };

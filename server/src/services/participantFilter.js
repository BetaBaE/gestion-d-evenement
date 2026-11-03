import mongoose from 'mongoose';
import { Scan } from '../models/Scan.js';

// Scans recorded in test mode never count as presence.
const REAL_SCAN = { test: { $ne: true } };
const STATUTS = ['EN_ATTENTE', 'VALIDE', 'REFUSE'];

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
  if (query.presence === 'present' || query.presence === 'absent') {
    const presentIds = await Scan.distinct('participantId', { eventId, ...REAL_SCAN });
    filter._id = query.presence === 'present' ? { $in: presentIds } : { $nin: presentIds };
  }
  return filter;
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

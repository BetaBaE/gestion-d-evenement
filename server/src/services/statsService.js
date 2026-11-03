import mongoose from 'mongoose';
import { Participant } from '../models/Participant.js';
import { Scan } from '../models/Scan.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { EmailLog } from '../models/EmailLog.js';

// Scans recorded in test mode never count in the statistics.
const REAL_SCAN = { test: { $ne: true } };

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

export async function getEventSummary(eventId) {
  const eventObjectId = toObjectId(eventId);

  const statutCounts = await Participant.aggregate([
    { $match: { eventId: eventObjectId } },
    { $group: { _id: '$statut', count: { $sum: 1 } } },
  ]);

  const counts = { EN_ATTENTE: 0, VALIDE: 0, REFUSE: 0 };
  statutCounts.forEach((row) => {
    counts[row._id] = row.count;
  });
  const inscrits = counts.EN_ATTENTE + counts.VALIDE + counts.REFUSE;

  const presentsResult = await Scan.aggregate([
    { $match: { eventId: eventObjectId, ...REAL_SCAN } },
    { $group: { _id: '$participantId' } },
    { $count: 'total' },
  ]);
  const presents = presentsResult[0]?.total || 0;

  const tauxPresence = counts.VALIDE > 0 ? presents / counts.VALIDE : 0;

  const totalEntriesResult = await Scan.aggregate([
    { $match: { eventId: eventObjectId, ...REAL_SCAN } },
    { $count: 'total' },
  ]);
  const totalEntries = totalEntriesResult[0]?.total || 0;

  return {
    inscrits,
    valides: counts.VALIDE,
    enAttente: counts.EN_ATTENTE,
    refuses: counts.REFUSE,
    presents,
    tauxPresence,
    totalEntries,
    uniqueEntrants: presents,
    reentries: totalEntries - presents,
  };
}

export async function getPresenceByCategorie(eventId) {
  const eventObjectId = toObjectId(eventId);

  const rows = await Participant.aggregate([
    { $match: { eventId: eventObjectId, statut: 'VALIDE' } },
    {
      $lookup: {
        from: 'scans',
        localField: '_id',
        foreignField: 'participantId',
        pipeline: [{ $match: REAL_SCAN }],
        as: 'scans',
      },
    },
    {
      $group: {
        _id: '$categorieId',
        inscrits: { $sum: 1 },
        presents: { $sum: { $cond: [{ $gt: [{ $size: '$scans' }, 0] }, 1, 0] } },
      },
    },
  ]);

  const categorieIds = rows.map((r) => r._id).filter(Boolean);
  const categories = await CategorieEvent.find({ _id: { $in: categorieIds } });
  const categorieMap = new Map(categories.map((c) => [c._id.toString(), c]));

  return rows.map((row) => ({
    categorieId: row._id,
    nom: categorieMap.get(row._id?.toString())?.nom || 'Inconnue',
    couleur: categorieMap.get(row._id?.toString())?.couleur || '#868e96',
    inscrits: row.inscrits,
    presents: row.presents,
  }));
}

export async function getPresenceByOrganisme(eventId) {
  const eventObjectId = toObjectId(eventId);

  const rows = await Participant.aggregate([
    { $match: { eventId: eventObjectId, statut: 'VALIDE' } },
    {
      $lookup: {
        from: 'scans',
        localField: '_id',
        foreignField: 'participantId',
        pipeline: [{ $match: REAL_SCAN }],
        as: 'scans',
      },
    },
    {
      $group: {
        _id: '$invitedOrganismId',
        inscrits: { $sum: 1 },
        presents: { $sum: { $cond: [{ $gt: [{ $size: '$scans' }, 0] }, 1, 0] } },
      },
    },
  ]);

  const organismeIds = rows.map((r) => r._id).filter(Boolean);
  const organismes = await InvitedOrganism.find({ _id: { $in: organismeIds } });
  const organismeMap = new Map(organismes.map((o) => [o._id.toString(), o]));

  return rows.map((row) => ({
    organismeId: row._id,
    nom: organismeMap.get(row._id?.toString())?.nom || 'Inconnu',
    inscrits: row.inscrits,
    presents: row.presents,
  }));
}

export async function getArrivalCurve(eventId) {
  const eventObjectId = toObjectId(eventId);

  const firstEntries = await Scan.aggregate([
    { $match: { eventId: eventObjectId, ...REAL_SCAN } },
    { $sort: { horodatage: 1 } },
    { $group: { _id: '$participantId', firstEntry: { $first: '$horodatage' } } },
  ]);

  const slotCounts = new Map();
  firstEntries.forEach(({ firstEntry }) => {
    const date = new Date(firstEntry);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 15) * 15;
    date.setMinutes(roundedMinutes, 0, 0);
    const key = date.toISOString();
    slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
  });

  return Array.from(slotCounts.entries())
    .map(([slot, count]) => ({ slot, count }))
    .sort((a, b) => new Date(a.slot) - new Date(b.slot));
}

export async function getNoShowParticipants(eventId) {
  const eventObjectId = toObjectId(eventId);

  const rows = await Participant.aggregate([
    { $match: { eventId: eventObjectId, statut: 'VALIDE' } },
    {
      $lookup: {
        from: 'scans',
        localField: '_id',
        foreignField: 'participantId',
        pipeline: [{ $match: REAL_SCAN }],
        as: 'scans',
      },
    },
    { $match: { scans: { $size: 0 } } },
    {
      $project: {
        nom: 1,
        prenom: 1,
        email: 1,
        fonction: 1,
        categorieId: 1,
        invitedOrganismId: 1,
      },
    },
  ]);

  return rows;
}

export async function getParticipantDetail(eventId, participantId) {
  const participant = await Participant.findOne({ _id: participantId, eventId });
  if (!participant) return null;

  const [categorie, organisme, scans, emailLogs] = await Promise.all([
    CategorieEvent.findById(participant.categorieId),
    InvitedOrganism.findById(participant.invitedOrganismId),
    Scan.find({ participantId: participant._id }).sort({ horodatage: 1 }),
    EmailLog.find({ participantId: participant._id }).sort({ createdAt: -1 }),
  ]);

  return {
    participant,
    categorie,
    organisme,
    scans,
    emailLogs,
    // The timeline lists test scans too (flagged test: true); counts don't.
    firstArrival: scans.find((sc) => !sc.test)?.horodatage || null,
    entryCount: scans.filter((sc) => !sc.test).length,
  };
}

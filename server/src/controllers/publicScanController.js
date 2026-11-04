import { z } from 'zod';
import { Participant } from '../models/Participant.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Scan } from '../models/Scan.js';
import { loadOpenScanEvent } from '../services/scanAccess.js';
import { formatScanDate, formatScanTime } from '../services/scanWindow.js';
import { classifyScan } from '../services/scanResult.js';
import { env } from '../config/env.js';

const scanSchema = z.object({
  badgeCode: z.string().min(1, 'Code requis.'),
});

export async function checkScanAccess(req, res, next) {
  try {
    const { event, modeTest } = await loadOpenScanEvent(req.params.scanToken);
    res.json({
      titre: event.titre,
      ville: event.ville,
      modeTest,
      scanTestJusquALabel: modeTest ? formatScanDate(event.scanTestJusquA, env.appTimezone) : null,
    });
  } catch (error) {
    next(error);
  }
}

/** Same summary for every result where the badge matches a participant of the event. */
async function participantSummary(participant, scanToken, sameKind) {
  const [categorie, organisme, [stats]] = await Promise.all([
    CategorieEvent.findById(participant.categorieId),
    InvitedOrganism.findById(participant.invitedOrganismId),
    Scan.aggregate([
      { $match: { participantId: participant._id, ...sameKind } },
      { $group: { _id: null, nb: { $sum: 1 }, premiere: { $min: '$horodatage' }, derniere: { $max: '$horodatage' } } },
    ]),
  ]);
  return {
    nomPrenom: `${participant.prenom || ''} ${(participant.nom || '').toUpperCase()}`.trim(),
    fonction: participant.fonction || '',
    organisme: organisme?.nom || null,
    categorie: categorie ? { nom: categorie.nom, couleur: categorie.couleur } : null,
    photoUrl: participant.photoImageId ? `/api/public/scan/${scanToken}/photo/${participant._id}` : null,
    nbEntrees: stats?.nb || 0,
    premiereEntree: stats?.premiere || null,
    derniereEntree: stats?.derniere || null,
  };
}

/**
 * Records a badge scan. Every answer carries a `result` code (OK,
 * DEJA_SCANNE, NON_VALIDE, INCONNU; link problems come back as errors with
 * details.code) and, whenever the badge matches a participant, the same
 * participant summary — so the agent always sees who it is.
 */
export async function recordScan(req, res, next) {
  try {
    const { badgeCode } = scanSchema.parse(req.body);
    const { scanToken } = req.params;
    const { event, modeTest } = await loadOpenScanEvent(scanToken);
    // Real and test scans are counted (and de-duplicated) separately.
    const sameKind = { test: modeTest ? true : { $ne: true } };

    const participant = await Participant.findOne({ eventId: event._id, badgeCode });
    const lastScan = participant ? await Scan.findOne({ participantId: participant._id, ...sameKind }).sort({ horodatage: -1 }) : null;
    const now = new Date();
    const decision = classifyScan({ participant, lastScan, now, antiDoublonMinutes: event.antiDoublonMinutes });

    if (decision.result === 'INCONNU') {
      return res.json({ result: 'INCONNU', modeTest });
    }
    if (decision.result === 'OK') {
      await Scan.create({
        eventId: event._id,
        participantId: participant._id,
        horodatage: now,
        appareil: req.headers['user-agent'],
        // Scans made while test mode is on are kept out of the statistics.
        test: modeTest,
      });
    }

    const summary = await participantSummary(participant, scanToken, sameKind);
    const body = { result: decision.result, modeTest, participant: summary };
    if (decision.result === 'OK') body.numeroEntree = summary.nbEntrees;
    if (decision.result === 'NON_VALIDE') body.statut = decision.statut;
    if (decision.result === 'DEJA_SCANNE') {
      body.dernierScanIlYa = decision.dernierScanIlYa;
      body.dernierScanA = decision.dernierScanA;
      body.dernierScanALabel = formatScanTime(decision.dernierScanA, env.appTimezone);
    }
    res.json(body);
  } catch (error) {
    next(error);
  }
}

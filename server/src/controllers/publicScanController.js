import { z } from 'zod';
import { Participant } from '../models/Participant.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Scan } from '../models/Scan.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { loadOpenScanEvent } from '../services/scanAccess.js';
import { formatScanDate } from '../services/scanWindow.js';
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

export async function recordScan(req, res, next) {
  try {
    const { badgeCode } = scanSchema.parse(req.body);
    const { event, modeTest } = await loadOpenScanEvent(req.params.scanToken);

    const participant = await Participant.findOne({ eventId: event._id, badgeCode });
    if (!participant || participant.statut !== 'VALIDE') {
      throw new ApiError(404, 'Badge invalide.');
    }

    const lastScan = await Scan.findOne({ participantId: participant._id }).sort({ horodatage: -1 });
    const now = new Date();
    if (lastScan) {
      const minutesSinceLastScan = (now - new Date(lastScan.horodatage)) / 60000;
      if (minutesSinceLastScan >= 0 && minutesSinceLastScan < event.antiDoublonMinutes) {
        return res.status(409).json({ message: 'Déjà scanné.', dejaScanne: true });
      }
    }

    await Scan.create({
      eventId: event._id,
      participantId: participant._id,
      horodatage: now,
      appareil: req.headers['user-agent'],
      // Scans made while test mode is on are kept out of the statistics.
      test: modeTest,
    });

    const entryNumber = (await Scan.countDocuments({ participantId: participant._id })) ;

    const [categorie, organisme] = await Promise.all([
      CategorieEvent.findById(participant.categorieId),
      InvitedOrganism.findById(participant.invitedOrganismId),
    ]);

    res.json({
      participantId: participant._id,
      nom: participant.nom,
      prenom: participant.prenom,
      categorie: categorie ? { nom: categorie.nom, couleur: categorie.couleur } : null,
      organisme: organisme ? { nom: organisme.nom } : null,
      entryNumber,
      modeTest,
      hasPhoto: !!participant.photoImageId,
    });
  } catch (error) {
    next(error);
  }
}

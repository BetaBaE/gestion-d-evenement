import { z } from 'zod';
import { Event } from '../models/Event.js';
import { Participant } from '../models/Participant.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Scan } from '../models/Scan.js';
import { ApiError } from '../middlewares/errorHandler.js';

const scanSchema = z.object({
  badgeCode: z.string().min(1, 'Code requis.'),
});

async function loadValidScanEvent(scanToken) {
  const event = await Event.findOne({ scanToken });
  if (!event) {
    throw new ApiError(403, 'Accès refusé.');
  }

  const now = new Date();
  if (
    !event.scanTokenValidFrom ||
    !event.scanTokenValidUntil ||
    now < new Date(event.scanTokenValidFrom) ||
    now > new Date(event.scanTokenValidUntil)
  ) {
    throw new ApiError(403, 'Accès refusé.');
  }

  return event;
}

export async function checkScanAccess(req, res, next) {
  try {
    const event = await loadValidScanEvent(req.params.scanToken);
    res.json({ titre: event.titre, ville: event.ville });
  } catch (error) {
    next(error);
  }
}

export async function recordScan(req, res, next) {
  try {
    const { badgeCode } = scanSchema.parse(req.body);
    const event = await loadValidScanEvent(req.params.scanToken);

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
      hasPhoto: !!participant.photoImageId,
    });
  } catch (error) {
    next(error);
  }
}

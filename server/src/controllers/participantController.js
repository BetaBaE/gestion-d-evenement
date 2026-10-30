import { z } from 'zod';
import { Participant } from '../models/Participant.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Organisateur } from '../models/Organisateur.js';
import { EmailLog } from '../models/EmailLog.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import { generateBadgeCode } from '../utils/tokens.js';
import { sendConfirmationEmail, sendBadgeEmail } from '../services/emailService.js';
import { optimizeAndStoreImage, deleteImage } from '../services/imageService.js';

const manualParticipantSchema = z.object({
  invitedOrganismId: z.string().min(1, "L'organisme est requis."),
  categorieId: z.string().optional(),
  civilite: z.enum(['M.', 'Mme']).optional(),
  nom: z.string().min(1, 'Le nom est requis.'),
  prenom: z.string().min(1, 'Le prénom est requis.'),
  fonction: z.string().min(1, 'La fonction est requise.'),
  email: z.string().email('Email invalide.'),
  telephone: z.string().optional(),
  commentaire: z.string().optional(),
});

const updateParticipantSchema = z.object({
  categorieId: z.string().optional(),
  civilite: z.enum(['M.', 'Mme']).optional(),
  nom: z.string().min(1).optional(),
  prenom: z.string().min(1).optional(),
  fonction: z.string().min(1).optional(),
  telephone: z.string().optional(),
  commentaire: z.string().optional(),
});

export const validateManualParticipant = manualParticipantSchema;

async function loadRelations(event, participant) {
  const [categorie, organisme, organisateur] = await Promise.all([
    CategorieEvent.findById(participant.categorieId),
    InvitedOrganism.findById(participant.invitedOrganismId),
    Organisateur.findById(event.organisateurId),
  ]);
  return { categorie, organisme, organisateur };
}

export async function listParticipants(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { eventId: req.event._id };

    if (req.query.statut) filter.statut = req.query.statut;
    if (req.query.categorieId) filter.categorieId = req.query.categorieId;
    if (req.query.invitedOrganismId) filter.invitedOrganismId = req.query.invitedOrganismId;
    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [{ nom: regex }, { prenom: regex }, { email: regex }];
    }

    const [items, total] = await Promise.all([
      Participant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Participant.countDocuments(filter),
    ]);
    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getParticipant(req, res, next) {
  try {
    const participant = await Participant.findOne({
      _id: req.params.participantId,
      eventId: req.event._id,
    });
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(participant);
  } catch (error) {
    next(error);
  }
}

export async function createManualParticipant(req, res, next) {
  try {
    const data = manualParticipantSchema.parse(req.body);

    const organisme = await InvitedOrganism.findOne({
      _id: data.invitedOrganismId,
      eventId: req.event._id,
    });
    if (!organisme) {
      throw new ApiError(400, "L'organisme spécifié n'existe pas pour cet événement.");
    }

    let categorieId = data.categorieId;
    if (!categorieId) {
      const defaultCategorie = await CategorieEvent.findOne({ eventId: req.event._id, isDefault: true });
      categorieId = defaultCategorie?._id;
    }

    const existing = await Participant.findOne({ eventId: req.event._id, email: data.email.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'Un participant avec cet email est déjà inscrit à cet événement.');
    }

    const participant = await Participant.create({
      ...data,
      eventId: req.event._id,
      categorieId,
      source: 'MANUEL',
      badgeCode: generateBadgeCode(),
      createdBy: req.user.sub,
    });

    res.status(201).json(participant);
  } catch (error) {
    next(error);
  }
}

export async function updateParticipant(req, res, next) {
  try {
    const data = updateParticipantSchema.parse(req.body);
    const participant = await Participant.findOneAndUpdate(
      { _id: req.params.participantId, eventId: req.event._id },
      data,
      { new: true, runValidators: true },
    );
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(participant);
  } catch (error) {
    next(error);
  }
}

export async function deleteParticipant(req, res, next) {
  try {
    const participant = await Participant.findOneAndDelete({
      _id: req.params.participantId,
      eventId: req.event._id,
    });
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function validateAndSendBadge(req, res, next) {
  try {
    const participant = await Participant.findOne({
      _id: req.params.participantId,
      eventId: req.event._id,
    });
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    participant.statut = 'VALIDE';
    participant.validatedBy = req.user.sub;
    participant.validatedAt = new Date();
    await participant.save();

    const { categorie, organisme, organisateur } = await loadRelations(req.event, participant);
    const result = await sendBadgeEmail({
      participant,
      event: req.event,
      organisateur,
      categorie,
      organisme,
    });

    if (result.success) {
      participant.badgeEnvoyeLe = new Date();
      await participant.save();
    }

    res.json({ participant, emailSent: result.success });
  } catch (error) {
    next(error);
  }
}

export async function validateAndSendBadgeBulk(req, res, next) {
  try {
    const { participantIds } = z.object({ participantIds: z.array(z.string()).min(1) }).parse(req.body);

    const participants = await Participant.find({
      _id: { $in: participantIds },
      eventId: req.event._id,
    });

    const results = [];
    for (const participant of participants) {
      participant.statut = 'VALIDE';
      participant.validatedBy = req.user.sub;
      participant.validatedAt = new Date();
      await participant.save();

      const { categorie, organisme, organisateur } = await loadRelations(req.event, participant);
      const result = await sendBadgeEmail({ participant, event: req.event, organisateur, categorie, organisme });

      if (result.success) {
        participant.badgeEnvoyeLe = new Date();
        await participant.save();
      }
      results.push({ participantId: participant._id, emailSent: result.success });
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
}

export async function refuseParticipant(req, res, next) {
  try {
    const participant = await Participant.findOneAndUpdate(
      { _id: req.params.participantId, eventId: req.event._id },
      { statut: 'REFUSE', validatedBy: req.user.sub, validatedAt: new Date() },
      { new: true },
    );
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    res.json(participant);
  } catch (error) {
    next(error);
  }
}

export async function resendEmail(req, res, next) {
  try {
    const { type } = z.object({ type: z.enum(['CONFIRMATION', 'BADGE']) }).parse(req.body);

    const participant = await Participant.findOne({
      _id: req.params.participantId,
      eventId: req.event._id,
    });
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const { categorie, organisme, organisateur } = await loadRelations(req.event, participant);

    const result =
      type === 'CONFIRMATION'
        ? await sendConfirmationEmail({ participant, event: req.event, organisateur })
        : await sendBadgeEmail({ participant, event: req.event, organisateur, categorie, organisme });

    res.json({ emailSent: result.success });
  } catch (error) {
    next(error);
  }
}

export async function listParticipantEmailLogs(req, res, next) {
  try {
    const logs = await EmailLog.find({ participantId: req.params.participantId }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    next(error);
  }
}

export async function uploadParticipantPhoto(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Une image est requise.');
    }

    const participant = await Participant.findOne({
      _id: req.params.participantId,
      eventId: req.event._id,
    });
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    const previousPhotoImageId = participant.photoImageId;

    const image = await optimizeAndStoreImage({
      buffer: req.file.buffer,
      type: 'PHOTO_PARTICIPANT',
      organisateurId: req.organisateurId,
      eventId: req.event._id,
    });

    participant.photoImageId = image._id;
    participant.consentementPhoto = true;
    participant.consentementPhotoLe = new Date();
    await participant.save();

    await deleteImage(previousPhotoImageId);

    res.json(participant);
  } catch (error) {
    next(error);
  }
}

export async function deleteParticipantPhoto(req, res, next) {
  try {
    const participant = await Participant.findOne({
      _id: req.params.participantId,
      eventId: req.event._id,
    });
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }

    await deleteImage(participant.photoImageId);
    participant.photoImageId = undefined;
    await participant.save();

    res.json(participant);
  } catch (error) {
    next(error);
  }
}

export async function deleteAllParticipantPhotos(req, res, next) {
  try {
    const participants = await Participant.find({
      eventId: req.event._id,
      photoImageId: { $exists: true, $ne: null },
    });

    await Promise.all(participants.map((p) => deleteImage(p.photoImageId)));

    await Participant.updateMany(
      { eventId: req.event._id },
      { $unset: { photoImageId: '' } },
    );

    res.json({ deleted: participants.length });
  } catch (error) {
    next(error);
  }
}

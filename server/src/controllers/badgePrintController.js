import { z } from 'zod';
import { Participant } from '../models/Participant.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Organisateur } from '../models/Organisateur.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { generateSingleBadgePdf, generateBatchBadgesPdf } from '../services/badgeService.js';
import { buildParticipantFilter } from '../services/participantFilter.js';
import { participantsWorkbook } from '../services/participantExport.js';

async function hydrateEntries(event, participants) {
  const categorieIds = [...new Set(participants.map((p) => p.categorieId?.toString()).filter(Boolean))];
  const organismeIds = [...new Set(participants.map((p) => p.invitedOrganismId?.toString()).filter(Boolean))];

  const [categories, organismes, organisateur] = await Promise.all([
    CategorieEvent.find({ _id: { $in: categorieIds } }),
    InvitedOrganism.find({ _id: { $in: organismeIds } }),
    Organisateur.findById(event.organisateurId),
  ]);

  const categorieMap = new Map(categories.map((c) => [c._id.toString(), c]));
  const organismeMap = new Map(organismes.map((o) => [o._id.toString(), o]));

  return participants.map((participant) => ({
    participant,
    event,
    categorie: categorieMap.get(participant.categorieId?.toString()),
    organisme: organismeMap.get(participant.invitedOrganismId?.toString()),
    organisateur,
  }));
}

export async function printSingleBadge(req, res, next) {
  try {
    const participant = await Participant.findOne({
      _id: req.params.participantId,
      eventId: req.event._id,
    });
    if (!participant) {
      throw new ApiError(404, 'Ressource introuvable');
    }
    if (participant.statut !== 'VALIDE') {
      throw new ApiError(400, "Seuls les participants validés peuvent avoir un badge imprimé.");
    }

    const [{ categorie, organisme, organisateur }] = await hydrateEntries(req.event, [participant]);
    const pdfBuffer = await generateSingleBadgePdf({
      participant,
      event: req.event,
      categorie,
      organisme,
      organisateur,
    });

    participant.nbImpressionsBadge += 1;
    participant.derniereImpressionLe = new Date();
    await participant.save();

    res.set('Content-Type', 'application/pdf');
    // Headers must be ASCII: "Hélène" would crash the response. ASCII
    // fallback + RFC 5987 filename* so browsers still show the real name.
    const fileName = `badge-${participant.nom}.pdf`;
    const asciiName = fileName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_');
    res.set('Content-Disposition', `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function printBatchBadges(req, res, next) {
  try {
    const { participantIds } = z.object({ participantIds: z.array(z.string()).min(1) }).parse(req.body);

    const participants = await Participant.find({
      _id: { $in: participantIds },
      eventId: req.event._id,
      statut: 'VALIDE',
    });

    if (participants.length === 0) {
      throw new ApiError(400, 'Aucun participant validé sélectionné.');
    }

    const entries = await hydrateEntries(req.event, participants);
    const pdfBuffer = await generateBatchBadgesPdf(entries);

    await Participant.updateMany(
      { _id: { $in: participants.map((p) => p._id) } },
      { $inc: { nbImpressionsBadge: 1 }, $set: { derniereImpressionLe: new Date() } },
    );

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="badges.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function exportParticipants(req, res, next) {
  try {
    // Same filters as the list on screen (search, organisme, catégorie,
    // validation, présence): "Exporter" exports what is displayed.
    const filter = await buildParticipantFilter(req.event._id, req.query);
    const participants = await Participant.find(filter).sort({ nom: 1, prenom: 1 });
    const workbook = await participantsWorkbook(req.event._id, participants);

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="participants.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

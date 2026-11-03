import { z } from 'zod';
import ExcelJS from 'exceljs';
import { Participant } from '../models/Participant.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Organisateur } from '../models/Organisateur.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { generateSingleBadgePdf, generateBatchBadgesPdf } from '../services/badgeService.js';

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
    const participants = await Participant.find({ eventId: req.event._id }).sort({ createdAt: -1 });
    const organismeIds = [...new Set(participants.map((p) => p.invitedOrganismId?.toString()).filter(Boolean))];
    const categorieIds = [...new Set(participants.map((p) => p.categorieId?.toString()).filter(Boolean))];
    const [organismes, categories] = await Promise.all([
      InvitedOrganism.find({ _id: { $in: organismeIds } }),
      CategorieEvent.find({ _id: { $in: categorieIds } }),
    ]);
    const organismeMap = new Map(organismes.map((o) => [o._id.toString(), o.nom]));
    const categorieMap = new Map(categories.map((c) => [c._id.toString(), c.nom]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Participants');
    sheet.columns = [
      { header: 'Civilité', key: 'civilite', width: 10 },
      { header: 'Nom', key: 'nom', width: 20 },
      { header: 'Prénom', key: 'prenom', width: 20 },
      { header: 'Fonction', key: 'fonction', width: 20 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Téléphone', key: 'telephone', width: 16 },
      { header: 'Organisme', key: 'organisme', width: 28 },
      { header: 'Catégorie', key: 'categorie', width: 16 },
      { header: 'Statut', key: 'statut', width: 14 },
      { header: "Date d'inscription", key: 'createdAt', width: 20 },
    ];

    participants.forEach((p) => {
      sheet.addRow({
        civilite: p.civilite,
        nom: p.nom,
        prenom: p.prenom,
        fonction: p.fonction,
        email: p.email,
        telephone: p.telephone,
        organisme: organismeMap.get(p.invitedOrganismId?.toString()),
        categorie: categorieMap.get(p.categorieId?.toString()),
        statut: p.statut,
        createdAt: p.createdAt.toLocaleDateString('fr-FR'),
      });
    });

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="participants.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

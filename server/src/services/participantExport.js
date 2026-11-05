import ExcelJS from 'exceljs';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { env } from '../config/env.js';
import { formatScanDate } from './scanWindow.js';
import { presenceByParticipant, ABSENT } from './participantFilter.js';

const STATUTS = { EN_ATTENTE: 'En attente', VALIDE: 'Validé', REFUSE: 'Refusé' };

/** Excel workbook of participants with organisme, catégorie and presence (one shared layout). */
export async function participantsWorkbook(eventId, participants) {
  const presence = await presenceByParticipant(eventId, participants.map((p) => p._id));
  const inZone = (d) => (d ? formatScanDate(d, env.appTimezone) : '');
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
    { header: 'Présence', key: 'presence', width: 12 },
    { header: 'Première entrée', key: 'premiereEntree', width: 22 },
    { header: 'Dernière entrée', key: 'derniereEntree', width: 22 },
    { header: 'Entrées', key: 'nbEntrees', width: 9 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  participants.forEach((p) => {
    const pres = presence[String(p._id)] || ABSENT;
    sheet.addRow({
      civilite: p.civilite,
      nom: p.nom,
      prenom: p.prenom,
      fonction: p.fonction,
      email: p.email,
      telephone: p.telephone,
      organisme: organismeMap.get(p.invitedOrganismId?.toString()),
      categorie: categorieMap.get(p.categorieId?.toString()),
      statut: STATUTS[p.statut] || p.statut,
      createdAt: inZone(p.createdAt),
      presence: pres.present ? 'Présent' : 'Absent',
      premiereEntree: inZone(pres.premiereEntree),
      derniereEntree: inZone(pres.derniereEntree),
      nbEntrees: pres.nbEntrees,
    });
  });
  return workbook;
}

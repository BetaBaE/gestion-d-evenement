import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { generateToken, generateBadgeCode } from '../utils/tokens.js';
import { Organisateur } from '../models/Organisateur.js';
import { User } from '../models/User.js';
import { Event } from '../models/Event.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { InvitedOrganism } from '../models/InvitedOrganism.js';
import { Participant } from '../models/Participant.js';
import { Scan } from '../models/Scan.js';

async function main() {
  await connectDb();

  const organisateur = await Organisateur.create({
    nom: 'Association des Métiers du Pétrole et de l\'Automobile',
    sigle: 'AMEPA',
    adresse: '12 rue des Oliviers',
    ville: 'Casablanca',
    pays: 'Maroc',
    telephone: '0522000000',
    email: 'contact@amepa.example.com',
    siteWeb: 'https://amepa.example.com',
  });

  const passwordHash = await bcrypt.hash('Demo1234!', 10);
  const gestionnaire = await User.create({
    nom: 'Alami',
    prenom: 'Sara',
    email: 'gestionnaire@amepa.example.com',
    passwordHash,
    role: 'GESTIONNAIRE',
    organisateurId: organisateur._id,
  });

  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() + 7);
  dateDebut.setHours(8, 0, 0, 0);
  const dateFin = new Date(dateDebut);
  dateFin.setHours(18, 0, 0, 0);

  const scanTokenValidFrom = new Date(dateDebut);
  scanTokenValidFrom.setHours(0, 0, 0, 0);
  const scanTokenValidUntil = new Date(dateFin);
  scanTokenValidUntil.setHours(23, 59, 59, 999);

  const event = await Event.create({
    organisateurId: organisateur._id,
    titre: 'Salon Annuel AMEPA 2026',
    description: 'Salon professionnel des métiers du pétrole et de l\'automobile.',
    lieu: 'Palais des Congrès',
    adresse: '45 avenue Hassan II',
    ville: 'Casablanca',
    dateDebut,
    dateFin,
    dateLimiteInscription: new Date(dateDebut.getTime() - 2 * 24 * 60 * 60 * 1000),
    statut: 'PUBLIE',
    formToken: generateToken(32),
    scanToken: generateToken(32),
    scanTokenValidFrom,
    scanTokenValidUntil,
    createdBy: gestionnaire._id,
  });

  const defaultCategorie = await CategorieEvent.create({
    eventId: event._id,
    nom: 'Invité',
    couleur: '#1971c2',
    isDefault: true,
  });

  const categorieVip = await CategorieEvent.create({
    eventId: event._id,
    nom: 'VIP',
    couleur: '#e8590c',
  });

  const categoriePresse = await CategorieEvent.create({
    eventId: event._id,
    nom: 'Presse',
    couleur: '#2f9e44',
  });

  const organismes = await InvitedOrganism.insertMany([
    {
      eventId: event._id,
      nom: 'Chambre de Commerce de Casablanca',
      siegeSocial: 'Casablanca',
      ville: 'Casablanca',
      pays: 'Maroc',
      telephone: '0522111111',
      email: 'contact@ccc.example.com',
      contactNom: 'Karim Benali',
      contactFonction: 'Directeur',
    },
    {
      eventId: event._id,
      nom: 'Fédération Marocaine des Transports',
      siegeSocial: 'Rabat',
      ville: 'Rabat',
      pays: 'Maroc',
      telephone: '0537222222',
      email: 'contact@fmt.example.com',
      contactNom: 'Nadia Tazi',
      contactFonction: 'Secrétaire Générale',
    },
    {
      eventId: event._id,
      nom: 'Groupe Pétrolier Atlas',
      siegeSocial: 'Tanger',
      ville: 'Tanger',
      pays: 'Maroc',
      telephone: '0539333333',
      email: 'contact@atlas.example.com',
      contactNom: 'Youssef Idrissi',
      contactFonction: 'Responsable Communication',
    },
  ]);

  const prenoms = ['Ahmed', 'Fatima', 'Omar', 'Khadija', 'Youssef', 'Salma', 'Hassan', 'Amina', 'Rachid', 'Leila'];
  const noms = ['Benjelloun', 'Chraibi', 'El Fassi', 'Berrada', 'Lahlou', 'Tahiri', 'Senhaji', 'Alaoui', 'Bennani', 'Zouiten'];
  const fonctions = ['Directeur', 'Ingénieur', 'Commercial', 'Consultant', 'Responsable Achats'];

  const groupeId = generateToken(8);
  const participants = [];
  for (let i = 0; i < 10; i += 1) {
    const organisme = organismes[i % organismes.length];
    const categorieId = i === 0 ? categorieVip._id : i === 1 ? categoriePresse._id : defaultCategorie._id;
    const statut = i < 7 ? 'VALIDE' : i < 9 ? 'EN_ATTENTE' : 'REFUSE';
    participants.push({
      eventId: event._id,
      invitedOrganismId: organisme._id,
      categorieId,
      civilite: i % 2 === 0 ? 'M.' : 'Mme',
      nom: noms[i],
      prenom: prenoms[i],
      fonction: fonctions[i % fonctions.length],
      email: `${prenoms[i].toLowerCase()}.${noms[i].toLowerCase()}@example.com`,
      telephone: '06000000' + String(i).padStart(2, '0'),
      statut,
      source: 'FORMULAIRE',
      inscriptionGroupeId: groupeId,
      badgeCode: generateBadgeCode(),
      badgeEnvoyeLe: statut === 'VALIDE' ? new Date() : undefined,
      validatedBy: statut === 'VALIDE' ? gestionnaire._id : undefined,
      validatedAt: statut === 'VALIDE' ? new Date() : undefined,
    });
  }

  const createdParticipants = await Participant.insertMany(participants);

  const validatedParticipants = createdParticipants.filter((p) => p.statut === 'VALIDE');
  const scans = [];
  validatedParticipants.slice(0, 5).forEach((participant, index) => {
    const base = new Date(dateDebut);
    base.setMinutes(base.getMinutes() + index * 15);
    scans.push({
      eventId: event._id,
      participantId: participant._id,
      horodatage: base,
      appareil: 'Demo Scanner',
    });
    if (index < 2) {
      const reentry = new Date(base);
      reentry.setHours(reentry.getHours() + 2);
      scans.push({
        eventId: event._id,
        participantId: participant._id,
        horodatage: reentry,
        appareil: 'Demo Scanner',
      });
    }
  });

  await Scan.insertMany(scans);

  console.log('Demo data seeded:');
  console.log(`  Organisateur: ${organisateur.nom}`);
  console.log(`  Gestionnaire: ${gestionnaire.email} / Demo1234!`);
  console.log(`  Event: ${event.titre}`);
  console.log(`  Form link: /inscription/${event.formToken}`);
  console.log(`  Scan link: /scan/${event.scanToken}`);
  console.log(`  Participants: ${createdParticipants.length}, Scans: ${scans.length}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Failed to seed demo data:', error);
  process.exit(1);
});

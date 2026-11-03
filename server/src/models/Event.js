import mongoose from 'mongoose';

// Elements carry free-form props/style that vary per element type (see
// /shared/badge-renderer/registry.js) — Mongoose doesn't validate their
// shape, the renderer's validateProps() does, at render and publish time.
const elementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    nom: { type: String },
    type: { type: String, required: true },
    panneau: { type: String, enum: ['P1', 'P2', 'P3', 'P4'], required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    largeur: { type: Number, required: true },
    hauteur: { type: Number, required: true },
    rotation: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
    verrouille: { type: Boolean, default: false },
    masque: { type: Boolean, default: false },
    groupeId: { type: String, default: null },
    visibleSi: {
      type: new mongoose.Schema({ categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CategorieEvent' }] }, { _id: false }),
      default: null,
    },
    props: { type: mongoose.Schema.Types.Mixed, default: {} },
    style: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const themeSchema = new mongoose.Schema(
  {
    couleurPrincipale: { type: String, default: '#1971c2' },
    couleurSecondaire: { type: String, default: '#dceefe' },
    couleurAccent: { type: String, default: '#e3a72f' },
    couleurTexte: { type: String, default: '#1f2a1f' },
    policeTitres: { type: String, default: 'Montserrat' },
    policeTexte: { type: String, default: 'Open Sans' },
    policeNom: { type: String, default: 'Merriweather' },
  },
  { _id: false },
);

// Event.badge — a copy of the ModeleBadge chosen for this event (Addendum 3
// v2 §2.1), free to adjust for this event only without changing the source
// template. No separate badgeBrouillon/publish split yet (phase 6c).
const badgeSchema = new mongoose.Schema(
  {
    modeleSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ModeleBadge', default: null },
    modeleSourceVersion: { type: Number, default: null },
    format: { type: String, enum: ['A4_PLIE_4', 'A6', 'CARTE'], default: 'A4_PLIE_4' },
    carteLargeurMm: { type: Number, default: 85.6 },
    carteHauteurMm: { type: Number, default: 54 },
    rotationLigneBas180: { type: Boolean, default: false },
    traitsDePliage: { type: Boolean, default: true },
    safeZoneMm: { type: Number, default: 5 },
    // A4 folded in 4: panels that print besides P1 (unset = all four).
    panneauxActifs: { type: [{ type: String, enum: ['P1', 'P2', 'P3', 'P4'] }], default: undefined },
    theme: { type: themeSchema, default: () => ({}) },
    elements: { type: [elementSchema], default: [] },
    version: { type: Number, default: 1 },
    publieLe: { type: Date, default: null },
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema(
  {
    organisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisateur',
      required: true,
      index: true,
    },
    titre: { type: String, required: true },
    description: { type: String },
    lieu: { type: String },
    adresse: { type: String },
    ville: { type: String },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    dateLimiteInscription: { type: Date },
    inscriptionOuverte: { type: Boolean, default: true },
    statut: {
      type: String,
      enum: ['BROUILLON', 'PUBLIE', 'CLOTURE', 'ARCHIVE'],
      default: 'BROUILLON',
    },
    capaciteMax: { type: Number },
    banniereUrl: { type: String },
    formToken: { type: String, unique: true },
    scanToken: { type: String, unique: true, sparse: true },
    // AUTO: the scan window follows the event dates (computed at each check).
    // MANUEL: scanTokenValidFrom / scanTokenValidUntil below are used.
    scanWindowMode: { type: String, enum: ['AUTO', 'MANUEL'], default: 'AUTO' },
    scanTokenValidFrom: { type: Date },
    scanTokenValidUntil: { type: Date },
    // Test mode: the link works whatever the window until this time.
    scanTestJusquA: { type: Date },
    antiDoublonMinutes: { type: Number, default: 2 },
    badge: { type: badgeSchema, default: () => ({}) },
    photoObligatoire: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Event = mongoose.model('Event', eventSchema);

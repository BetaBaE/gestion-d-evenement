import mongoose from 'mongoose';

// Blocks carry free-form props/style that vary per block type (see
// /shared/badge-renderer/registry.js) — Mongoose doesn't validate their
// shape, the renderer's validateProps() does, at render and publish time.
const blocSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    props: { type: mongoose.Schema.Types.Mixed, default: {} },
    style: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const panneauSchema = new mongoose.Schema(
  {
    actif: { type: Boolean, default: true },
    blocs: { type: [blocSchema], default: [] },
  },
  { _id: false },
);

const badgeConfigSchema = new mongoose.Schema(
  {
    // ---- Format (kept from Addendum 2) ----
    format: { type: String, enum: ['A4_PLIE_4', 'A6', 'CARTE'], default: 'A4_PLIE_4' },
    carteLargeurMm: { type: Number, default: 85.6 },
    carteHauteurMm: { type: Number, default: 54 },
    rotationLigneBas180: { type: Boolean, default: false },
    traitsDePliage: { type: Boolean, default: true },

    // ---- Theme (kept from Addendum 2) ----
    theme: {
      couleurPrincipale: { type: String, default: '#1971c2' },
      couleurSecondaire: { type: String, default: '#dceefe' },
      couleurAccent: { type: String, default: '#e3a72f' },
      couleurTexte: { type: String, default: '#1f2a1f' },
      degradeEntete: { type: Boolean, default: true },
      policeTitres: { type: String, default: 'Montserrat' },
      policeTexte: { type: String, default: 'Open Sans' },
      policeNom: { type: String, default: 'Merriweather' },
    },

    // ---- Content: blocks per panel (Addendum 3, replaces entete /
    // infosPratiques / groupesPartenaires / encartPromo / siteWeb /
    // reseauxSociaux from Addendum 2) ----
    panneaux: {
      P1: { type: panneauSchema, default: () => ({ actif: true, blocs: [] }) },
      P2: { type: panneauSchema, default: () => ({ actif: true, blocs: [] }) },
      P3: { type: panneauSchema, default: () => ({ actif: true, blocs: [] }) },
      P4: { type: panneauSchema, default: () => ({ actif: true, blocs: [] }) },
    },
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
    scanTokenValidFrom: { type: Date },
    scanTokenValidUntil: { type: Date },
    antiDoublonMinutes: { type: Number, default: 2 },
    badgeConfig: { type: badgeConfigSchema, default: () => ({}) },
    photoObligatoire: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Event = mongoose.model('Event', eventSchema);

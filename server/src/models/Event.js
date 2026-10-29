import mongoose from 'mongoose';

const badgeConfigSchema = new mongoose.Schema(
  {
    largeurMm: { type: Number, default: 85.6 },
    hauteurMm: { type: Number, default: 54 },
    orientation: { type: String, enum: ['portrait', 'paysage'], default: 'paysage' },
    afficherLogo: { type: Boolean, default: true },
    afficherOrganisme: { type: Boolean, default: true },
    afficherFonction: { type: Boolean, default: true },
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Event = mongoose.model('Event', eventSchema);

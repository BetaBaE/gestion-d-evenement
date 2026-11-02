import mongoose from 'mongoose';

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

const modeleBadgeSchema = new mongoose.Schema(
  {
    organisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisateur', required: true, index: true },
    nom: { type: String, required: true },
    description: { type: String },
    format: { type: String, enum: ['A4_PLIE_4', 'A6', 'CARTE'], default: 'A4_PLIE_4' },
    carteLargeurMm: { type: Number, default: 85.6 },
    carteHauteurMm: { type: Number, default: 54 },
    rotationLigneBas180: { type: Boolean, default: false },
    traitsDePliage: { type: Boolean, default: true },
    safeZoneMm: { type: Number, default: 5 },
    theme: { type: themeSchema, default: () => ({}) },
    elements: { type: [elementSchema], default: [] },
    miniatureImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', default: null },
    parDefaut: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    archive: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

modeleBadgeSchema.index({ organisateurId: 1, nom: 1 }, { unique: true });

export const ModeleBadge = mongoose.model('ModeleBadge', modeleBadgeSchema);

import mongoose from 'mongoose';

// Addendum 3 v2 §2.3 — new ModeleBadge templates start from this; the
// editor's color picker shows these colors first, then theme tokens, then
// free hex. Not yet wired into any UI (that's phase 6b/6d), just storage.
const brandKitSchema = new mongoose.Schema(
  {
    couleurs: {
      principale: { type: String, default: '#1971c2' },
      secondaire: { type: String, default: '#dceefe' },
      accent: { type: String, default: '#e3a72f' },
      texte: { type: String, default: '#1f2a1f' },
    },
    polices: {
      titres: { type: String, default: 'Montserrat' },
      texte: { type: String, default: 'Open Sans' },
      nom: { type: String, default: 'Merriweather' },
    },
    logos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Image' }],
  },
  { _id: false },
);

const organisateurSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, unique: true },
    sigle: { type: String },
    adresse: { type: String },
    ville: { type: String },
    pays: { type: String },
    telephone: { type: String },
    fax: { type: String },
    email: { type: String },
    siteWeb: { type: String },
    logoImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
    actif: { type: Boolean, default: true },
    brandKit: { type: brandKitSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const Organisateur = mongoose.model('Organisateur', organisateurSchema);

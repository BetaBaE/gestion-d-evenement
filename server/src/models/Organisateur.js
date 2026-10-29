import mongoose from 'mongoose';

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
    logoUrl: { type: String },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Organisateur = mongoose.model('Organisateur', organisateurSchema);

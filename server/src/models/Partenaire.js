import mongoose from 'mongoose';

const partenaireSchema = new mongoose.Schema(
  {
    organisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisateur', required: true, index: true },
    nom: { type: String, required: true },
    logoImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image', required: true },
    siteWeb: { type: String },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true },
);

partenaireSchema.index({ organisateurId: 1, nom: 1 }, { unique: true });

export const Partenaire = mongoose.model('Partenaire', partenaireSchema);

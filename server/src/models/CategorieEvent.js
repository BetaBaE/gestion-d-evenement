import mongoose from 'mongoose';

const categorieEventSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    nom: { type: String, required: true },
    couleur: { type: String },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

categorieEventSchema.index({ eventId: 1, nom: 1 }, { unique: true });

export const CategorieEvent = mongoose.model('CategorieEvent', categorieEventSchema);

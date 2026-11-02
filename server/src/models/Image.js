import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true, select: false },
    mimeType: { type: String, required: true },
    taille: { type: Number, required: true },
    largeur: { type: Number, required: true },
    hauteur: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        'PHOTO_PARTICIPANT',
        'LOGO_ORGANISATEUR',
        'LOGO_ORGANISME',
        'FOND_BADGE',
        'LOGO_EVENEMENT',
        'BANNIERE_BADGE',
        'LOGO_PARTENAIRE',
      ],
      required: true,
    },
    organisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisateur', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    hash: { type: String, required: true },
  },
  { timestamps: true },
);

imageSchema.index({ organisateurId: 1 });
imageSchema.index({ eventId: 1 });

export const Image = mongoose.model('Image', imageSchema);

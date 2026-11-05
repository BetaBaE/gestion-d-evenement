import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    invitedOrganismId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvitedOrganism',
      required: true,
    },
    categorieId: { type: mongoose.Schema.Types.ObjectId, ref: 'CategorieEvent', required: true },
    civilite: { type: String, enum: ['M.', 'Mme'] },
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    fonction: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    telephone: { type: String },
    statut: {
      type: String,
      enum: ['EN_ATTENTE', 'VALIDE', 'REFUSE'],
      default: 'EN_ATTENTE',
    },
    source: { type: String, enum: ['FORMULAIRE', 'MANUEL'], required: true },
    inscriptionGroupeId: { type: String },
    badgeCode: { type: String, unique: true },
    badgeEnvoyeLe: { type: Date },
    nbImpressionsBadge: { type: Number, default: 0 },
    derniereImpressionLe: { type: Date },
    commentaire: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    validatedAt: { type: Date },
    // Bulk job that validated this participant: a resumed job re-queues the
    // badge email (deduplicated) instead of skipping it as "déjà validé".
    validationJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    photoImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
    consentementPhoto: { type: Boolean, default: false },
    consentementPhotoLe: { type: Date },
  },
  { timestamps: true },
);

participantSchema.index({ eventId: 1, email: 1 }, { unique: true });

export const Participant = mongoose.model('Participant', participantSchema);

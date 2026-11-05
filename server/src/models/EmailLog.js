import mongoose from 'mongoose';

/**
 * One email, from the moment it is queued (EN_FILE) until it is sent
 * (ENVOYE) or given up (ECHEC). ENVOI = being sent by a worker right now
 * (lockedUntil). Nothing sends email directly: everything goes through this
 * queue, which applies each organisateur's rate limit and retries.
 */
const emailLogSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    organisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisateur', index: true },
    type: { type: String, enum: ['CONFIRMATION', 'BADGE'], required: true },
    destinataire: { type: String, required: true },
    statut: { type: String, enum: ['EN_FILE', 'ENVOI', 'ENVOYE', 'ECHEC'], required: true },
    tentatives: { type: Number, default: 0 },
    prochainEssai: { type: Date },
    lockedUntil: { type: Date },
    sentAt: { type: Date },
    erreur: { type: String },
    // AUTH (identifiants refusés) | TEMPORAIRE (réessayé) | PERMANENT | INTERROMPU
    erreurType: { type: String },
    expediteurUtilise: { type: String, enum: ['ORGANISATEUR', 'PLATEFORME'] },
    // Same key twice = same email (resumed job, double click): never sent twice.
    dedupeKey: { type: String },
  },
  { timestamps: true },
);

emailLogSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } });
emailLogSchema.index({ statut: 1, prochainEssai: 1 });
emailLogSchema.index({ organisateurId: 1, statut: 1, sentAt: 1 });
emailLogSchema.index({ eventId: 1, statut: 1 });

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);

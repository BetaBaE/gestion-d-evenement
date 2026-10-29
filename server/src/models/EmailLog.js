import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    type: { type: String, enum: ['CONFIRMATION', 'BADGE'], required: true },
    destinataire: { type: String, required: true },
    statut: { type: String, enum: ['ENVOYE', 'ECHEC'], required: true },
    erreur: { type: String },
  },
  { timestamps: true },
);

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);

import mongoose from 'mongoose';

const emailSettingsSchema = new mongoose.Schema(
  {
    organisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisateur',
      required: true,
      unique: true,
    },
    smtpHost: { type: String, required: true },
    smtpPort: { type: Number, required: true },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, required: true },
    smtpPassEncrypted: { type: String, required: true, select: false },
    fromName: { type: String },
    fromEmail: { type: String, required: true },
    replyTo: { type: String },
    actif: { type: Boolean, default: true },
    dernierTestLe: { type: Date },
    dernierTestStatut: { type: String, enum: ['OK', 'ECHEC'] },
    dernierTestErreur: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const EmailSettings = mongoose.model('EmailSettings', emailSettingsSchema);

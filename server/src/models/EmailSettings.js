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
    // Sending rate of the email queue for this mailbox (Microsoft 365 is ~30/min).
    limiteParMinute: { type: Number, default: 20, min: 1, max: 500 },
    limiteParJour: { type: Number, min: 1 },
    // Set when the server refused the credentials: emails fail fast until fixed.
    alerteAuth: {
      le: { type: Date },
      message: { type: String },
    },
    dernierTestLe: { type: Date },
    dernierTestStatut: { type: String, enum: ['OK', 'ECHEC'] },
    dernierTestErreur: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const EmailSettings = mongoose.model('EmailSettings', emailSettingsSchema);

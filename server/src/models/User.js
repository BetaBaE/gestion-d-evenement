import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['SUPER_ADMIN', 'GESTIONNAIRE'], required: true },
    organisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisateur',
      required: function () {
        return this.role === 'GESTIONNAIRE';
      },
    },
    telephone: { type: String },
    actif: { type: Boolean, default: true },
    dernierLogin: { type: Date },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);

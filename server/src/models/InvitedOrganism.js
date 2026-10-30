import mongoose from 'mongoose';

const invitedOrganismSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    nom: { type: String, required: true },
    siegeSocial: { type: String },
    adresse: { type: String },
    ville: { type: String },
    pays: { type: String },
    telephone: { type: String },
    fax: { type: String },
    email: { type: String },
    siteWeb: { type: String },
    contactNom: { type: String },
    contactFonction: { type: String },
    contactTelephone: { type: String },
    contactEmail: { type: String },
    invitationEnvoyeeLe: { type: Date },
    logoImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
  },
  { timestamps: true },
);

invitedOrganismSchema.index({ eventId: 1, nom: 1 }, { unique: true });

export const InvitedOrganism = mongoose.model('InvitedOrganism', invitedOrganismSchema);

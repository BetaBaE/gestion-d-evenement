import mongoose from 'mongoose';

const fichierSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    nom: { type: String, required: true },
    taille: { type: Number },
  },
  { _id: false },
);

/**
 * A background job (bulk action, badge printing…). Processed in short,
 * time-boxed steps by the worker: `position` is how far it got in `items`,
 * so a restart or a crash simply resumes from there (every per-item
 * operation is idempotent). `lockedUntil` keeps two workers off the same job.
 */
const jobSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    organisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisateur', required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Client-generated: the same requestId twice (double click) returns the same job.
    requestId: { type: String, required: true },
    libelle: { type: String },
    statut: {
      type: String,
      enum: ['EN_ATTENTE', 'EN_COURS', 'TERMINE', 'TERMINE_AVEC_ERREURS', 'ECHEC', 'ANNULE'],
      default: 'EN_ATTENTE',
      index: true,
    },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    items: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    position: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    traites: { type: Number, default: 0 },
    reussis: { type: Number, default: 0 },
    ignores: { type: Number, default: 0 },
    echecs: { type: [{ participantId: mongoose.Schema.Types.ObjectId, erreur: String, _id: false }], default: [] },
    // Handler scratch space between steps (e.g. PDF chunks already rendered).
    etat: { type: mongoose.Schema.Types.Mixed, default: {} },
    resultat: {
      message: { type: String },
      fichiers: { type: [fichierSchema], default: [] },
      expireLe: { type: Date },
    },
    erreur: { type: String },
    lockedUntil: { type: Date, default: null },
    reprises: { type: Number, default: 0 },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true },
);

jobSchema.index({ createdBy: 1, requestId: 1 }, { unique: true });
jobSchema.index({ statut: 1, lockedUntil: 1, createdAt: 1 });

export const Job = mongoose.model('Job', jobSchema);

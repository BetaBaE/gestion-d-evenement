import mongoose from 'mongoose';

const horaireSchema = new mongoose.Schema(
  {
    libelleJours: { type: String },
    ouverture: { type: String },
    fermeture: { type: String },
  },
  { _id: false },
);

const groupePartenaireSchema = new mongoose.Schema(
  {
    titre: { type: String },
    ordre: { type: Number, default: 0 },
    panneau: { type: String, enum: ['P3', 'P4', 'AUTO'], default: 'AUTO' },
    tailleLogos: { type: String, enum: ['S', 'M', 'L'], default: 'M' },
    partenaires: [
      new mongoose.Schema(
        {
          partenaireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partenaire' },
          ordre: { type: Number, default: 0 },
        },
        { _id: false },
      ),
    ],
  },
  { _id: false },
);

const badgeConfigSchema = new mongoose.Schema(
  {
    // ---- Format ----
    format: { type: String, enum: ['A4_PLIE_4', 'A6', 'CARTE'], default: 'A4_PLIE_4' },
    carteLargeurMm: { type: Number, default: 85.6 },
    carteHauteurMm: { type: Number, default: 54 },
    panneauxActifs: {
      p2: { type: Boolean, default: true },
      p3: { type: Boolean, default: true },
      p4: { type: Boolean, default: true },
    },
    rotationLigneBas180: { type: Boolean, default: false },
    traitsDePliage: { type: Boolean, default: true },
    afficherPhoto: { type: Boolean, default: false },

    // ---- Theme ----
    theme: {
      couleurPrincipale: { type: String, default: '#1971c2' },
      couleurSecondaire: { type: String, default: '#dceefe' },
      couleurAccent: { type: String, default: '#e3a72f' },
      couleurTexte: { type: String, default: '#1f2a1f' },
      degradeEntete: { type: Boolean, default: true },
      policeTitres: { type: String, default: 'Montserrat' },
      policeTexte: { type: String, default: 'Open Sans' },
      policeNom: { type: String, default: 'Merriweather' },
    },

    // ---- Header (P1, and compact on P3) ----
    entete: {
      modeImage: { type: Boolean, default: false },
      banniereImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
      logoEvenementImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
      patronageAr: { type: String, maxlength: 300 },
      patronageFr: { type: String, maxlength: 300 },
      titreAffiche: { type: String, maxlength: 300 },
      sousTitreParLigne: { type: String, maxlength: 300 },
      edition: { type: String, maxlength: 300 },
      descriptif: { type: String, maxlength: 300 },
    },
    siteWeb: { type: String },
    reseauxSociaux: {
      facebook: { type: String },
      instagram: { type: String },
      linkedin: { type: String },
      youtube: { type: String },
      x: { type: String },
    },

    // ---- P2 ----
    infosPratiques: {
      messageValidite: { type: String, maxlength: 300 },
      horaires: [horaireSchema],
      lieuNom: { type: String, maxlength: 300 },
      lieuDetail: { type: String, maxlength: 300 },
      droitsEntree: { type: String, maxlength: 300 },
      venirAuSalon: { type: String, maxlength: 300 },
      noteEncadree: {
        texte: { type: String, maxlength: 300 },
        lien: { type: String },
      },
      afficherOrganisateur: { type: Boolean, default: true },
    },

    // ---- P3 / P4 ----
    groupesPartenaires: [groupePartenaireSchema],
    encartPromo: {
      actif: { type: Boolean, default: false },
      titre: { type: String, maxlength: 300 },
      pastille: { type: String, maxlength: 20 },
      texte: { type: String, maxlength: 300 },
      couleur: { type: String, default: '#e8732c' },
      partenaireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partenaire' },
    },

    // Deprecated single-card fields, kept only for backward-compat reads of
    // events created before this schema; the back-office always writes the
    // fields above now. Not exposed in validation.
    fondImageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
    couleurPrincipale: { type: String },
    afficherLogoOrganisateur: { type: Boolean, default: true },
    afficherLogoOrganisme: { type: Boolean, default: false },
    afficherOrganisme: { type: Boolean, default: true },
    afficherFonction: { type: Boolean, default: true },
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema(
  {
    organisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisateur',
      required: true,
      index: true,
    },
    titre: { type: String, required: true },
    description: { type: String },
    lieu: { type: String },
    adresse: { type: String },
    ville: { type: String },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    dateLimiteInscription: { type: Date },
    inscriptionOuverte: { type: Boolean, default: true },
    statut: {
      type: String,
      enum: ['BROUILLON', 'PUBLIE', 'CLOTURE', 'ARCHIVE'],
      default: 'BROUILLON',
    },
    capaciteMax: { type: Number },
    banniereUrl: { type: String },
    formToken: { type: String, unique: true },
    scanToken: { type: String, unique: true, sparse: true },
    scanTokenValidFrom: { type: Date },
    scanTokenValidUntil: { type: Date },
    antiDoublonMinutes: { type: Number, default: 2 },
    badgeConfig: { type: badgeConfigSchema, default: () => ({}) },
    photoObligatoire: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Event = mongoose.model('Event', eventSchema);

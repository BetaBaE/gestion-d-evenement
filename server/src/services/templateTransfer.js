import { z } from 'zod';
import mongoose from 'mongoose';
import { ModeleBadge } from '../models/ModeleBadge.js';
import { Image } from '../models/Image.js';
import { Partenaire } from '../models/Partenaire.js';
import { CategorieEvent } from '../models/CategorieEvent.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { elementSchema, themeSchema, validateElementTypes } from '../validation/badgeElements.js';
import { optimizeAndStoreImage } from './imageService.js';
import { unknownVariables } from '../../../shared/badge-renderer/index.js';

/**
 * Template files (.badge.json): an exact copy of a template, its images and
 * partner logos embedded as base64 (inside the file only — imported images
 * are stored like any other image).
 */
export const SCHEMA_VERSION = 1;
const APPLICATION = 'gestion-evenements-badges';

const LAYOUT_FIELDS = [
  'format',
  'carteLargeurMm',
  'carteHauteurMm',
  'rotationLigneBas180',
  'traitsDePliage',
  'safeZoneMm',
  'panneauxActifs',
  'theme',
  'elements',
];

const IMPORTABLE_IMAGE_TYPES = ['BLOC_IMAGE', 'LOGO_PARTENAIRE', 'FOND_PAGE'];

// Older files are upgraded step by step: MIGRATIONS[n] turns a version-n
// file into version n + 1. None yet — version 1 is the first format.
const MIGRATIONS = {};

function referencedIds(elements) {
  const imageIds = new Set();
  const partenaireIds = new Set();
  const categorieIds = new Set();
  elements.forEach((el) => {
    if (el.type === 'image' && el.props?.imageId) imageIds.add(String(el.props.imageId));
    if (el.type === 'grillePartenaires') (el.props?.partenaires || []).forEach((p) => p.partenaireId && partenaireIds.add(String(p.partenaireId)));
    (el.visibleSi?.categories || []).forEach((id) => categorieIds.add(String(id)));
  });
  return { imageIds, partenaireIds, categorieIds };
}

async function imagesAsBase64(ids) {
  const images = await Image.find({ _id: { $in: [...ids] } }).select('+data type mimeType');
  return Object.fromEntries(images.map((img) => [String(img._id), { type: img.type, mimeType: img.mimeType, data: img.data.toString('base64') }]));
}

/** Builds the .badge.json content of a template. */
export async function exportTemplate(modele) {
  const source = modele.toObject ? modele.toObject() : modele;
  const elements = structuredClone(source.elements || []);
  const { imageIds, partenaireIds, categorieIds } = referencedIds(elements);

  const partenaires = await Partenaire.find({ _id: { $in: [...partenaireIds] }, organisateurId: source.organisateurId });
  partenaires.forEach((p) => p.logoImageId && imageIds.add(String(p.logoImageId)));
  const categories = await CategorieEvent.find({ _id: { $in: [...categorieIds] } }).select('nom');
  const categorieNames = new Map(categories.map((c) => [String(c._id), c.nom]));

  // Category ids only mean something inside one event: export their names.
  elements.forEach((el) => {
    if (el.visibleSi?.categories?.length) {
      el.visibleSi = {
        categories: [],
        categoriesNoms: el.visibleSi.categories.map((id) => categorieNames.get(String(id))).filter(Boolean),
      };
    }
  });

  const modeleData = { nom: source.nom, description: source.description };
  LAYOUT_FIELDS.forEach((f) => {
    if (source[f] !== undefined && source[f] !== null) modeleData[f] = f === 'elements' ? elements : structuredClone(source[f]);
  });

  return {
    application: APPLICATION,
    schemaVersion: SCHEMA_VERSION,
    exporteLe: new Date().toISOString(),
    modele: modeleData,
    images: await imagesAsBase64(imageIds),
    partenaires: Object.fromEntries(
      partenaires.map((p) => [String(p._id), { nom: p.nom, siteWeb: p.siteWeb || '', logoImageId: p.logoImageId ? String(p.logoImageId) : null }]),
    ),
  };
}

const fileSchema = z.object({
  application: z.literal(APPLICATION, { message: 'Ce fichier ne vient pas de cette application.' }),
  schemaVersion: z.number().int().positive(),
  modele: z.object({
    nom: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    format: z.enum(['A4_PLIE_4', 'A6', 'CARTE']),
    carteLargeurMm: z.number().min(40).max(210).optional(),
    carteHauteurMm: z.number().min(40).max(297).optional(),
    rotationLigneBas180: z.boolean().optional(),
    traitsDePliage: z.boolean().optional(),
    safeZoneMm: z.number().min(3).max(8).optional(),
    panneauxActifs: z.array(z.enum(['P1', 'P2', 'P3', 'P4'])).optional(),
    theme: themeSchema.optional(),
    elements: z.array(elementSchema).max(300),
  }),
  images: z.record(
    z.string(),
    z.object({ type: z.enum(IMPORTABLE_IMAGE_TYPES), mimeType: z.string(), data: z.string().min(1) }),
  ),
  partenaires: z.record(
    z.string(),
    z.object({ nom: z.string().trim().min(1).max(200), siteWeb: z.string().optional(), logoImageId: z.string().nullable() }),
  ),
});

/** {{variables}} of the template's texts that the registry doesn't know (listed in the import summary). */
export function templateUnknownVariables(elements) {
  return [...new Set((elements || []).filter((el) => el.type === 'texte').flatMap((el) => unknownVariables(el.props?.contenu)))];
}

/** Parses, upgrades and validates a .badge.json buffer. Throws a clear ApiError. */
export function parseTemplateFile(buffer) {
  let raw;
  try {
    raw = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new ApiError(400, "Fichier illisible : ce n'est pas un fichier .badge.json valide.");
  }
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.schemaVersion)) {
    throw new ApiError(400, "Fichier illisible : version du format absente. Utilisez un fichier exporté depuis l'application.");
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new ApiError(
      400,
      `Ce fichier a été exporté par une version plus récente de l'application (format v${raw.schemaVersion}, cette version lit jusqu'à v${SCHEMA_VERSION}). Mettez l'application à jour pour l'importer.`,
    );
  }
  let data = raw;
  for (let v = raw.schemaVersion; v < SCHEMA_VERSION; v += 1) {
    if (!MIGRATIONS[v]) throw new ApiError(400, `Format v${v} non pris en charge.`);
    data = MIGRATIONS[v](data);
  }

  const parsed = fileSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, `Fichier invalide : ${issue.message} (${issue.path.join('.') || 'racine'}).`, parsed.error.issues.slice(0, 5));
  }
  const file = parsed.data;

  const typeErrors = validateElementTypes(file.modele.elements);
  if (typeErrors.length > 0) {
    throw new ApiError(400, 'Fichier invalide : éléments de badge incorrects.', typeErrors);
  }
  // Every image / partner an element points to must be in the file.
  const { imageIds, partenaireIds } = referencedIds(file.modele.elements);
  const missing = [
    ...[...imageIds].filter((id) => !file.images[id]),
    ...[...partenaireIds].filter((id) => !file.partenaires[id]),
    ...Object.values(file.partenaires).map((p) => p.logoImageId).filter((id) => id && !file.images[id]),
  ];
  if (missing.length > 0) {
    throw new ApiError(400, `Fichier incomplet : ${missing.length} image(s) ou partenaire(s) manquant(s).`);
  }
  return file;
}

async function uniqueName(organisateurId, nom) {
  let candidate = nom;
  // eslint-disable-next-line no-await-in-loop
  while (await ModeleBadge.exists({ organisateurId, nom: candidate, archive: { $ne: true } })) {
    candidate = `${candidate} (importé)`;
  }
  return candidate;
}

/**
 * Creates the template of a parsed file in `organisateurId`: images
 * re-created, partners matched by name in the library (created when
 * missing). If anything fails, everything created so far is removed.
 */
export async function importTemplate(file, { organisateurId, userId }) {
  const createdImageIds = [];
  const createdPartenaireIds = [];
  try {
    const imageMap = new Map();
    for (const [oldId, img] of Object.entries(file.images)) {
      // eslint-disable-next-line no-await-in-loop
      const stored = await optimizeAndStoreImage({ buffer: Buffer.from(img.data, 'base64'), type: img.type, organisateurId });
      createdImageIds.push(stored._id);
      imageMap.set(oldId, String(stored._id));
    }

    const library = await Partenaire.find({ organisateurId }).select('nom');
    const byName = new Map(library.map((p) => [p.nom.trim().toLowerCase(), String(p._id)]));
    const partenaireMap = new Map();
    let crees = 0;
    let reutilises = 0;
    for (const [oldId, p] of Object.entries(file.partenaires)) {
      const existing = byName.get(p.nom.trim().toLowerCase());
      if (existing) {
        partenaireMap.set(oldId, existing);
        reutilises += 1;
      } else {
        if (!p.logoImageId) throw new ApiError(400, `Le partenaire « ${p.nom} » n'a pas de logo dans le fichier.`);
        // eslint-disable-next-line no-await-in-loop
        const created = await Partenaire.create({ nom: p.nom, siteWeb: p.siteWeb, logoImageId: imageMap.get(p.logoImageId), organisateurId, actif: true });
        createdPartenaireIds.push(created._id);
        byName.set(p.nom.trim().toLowerCase(), String(created._id));
        partenaireMap.set(oldId, String(created._id));
        crees += 1;
      }
    }
    // Logos of partners that already existed were imported for nothing: drop them.
    const { imageIds: elementImageIds } = referencedIds(file.modele.elements);
    const createdPartnerLogos = new Set(
      Object.entries(file.partenaires)
        .filter(([oldId]) => createdPartenaireIds.some((id) => String(id) === partenaireMap.get(oldId)))
        .map(([, p]) => p.logoImageId),
    );
    const unused = [...imageMap.keys()].filter((oldId) => !elementImageIds.has(oldId) && !createdPartnerLogos.has(oldId));
    if (unused.length > 0) {
      const ids = unused.map((oldId) => imageMap.get(oldId));
      await Image.deleteMany({ _id: { $in: ids } });
      ids.forEach((id) => createdImageIds.splice(createdImageIds.findIndex((c) => String(c) === id), 1));
    }

    const elements = file.modele.elements.map((el) => {
      const next = structuredClone(el);
      if (next.type === 'image' && next.props?.imageId) next.props.imageId = imageMap.get(String(next.props.imageId));
      if (next.type === 'grillePartenaires') {
        next.props.partenaires = (next.props.partenaires || []).map((p) => ({ ...p, partenaireId: partenaireMap.get(String(p.partenaireId)) }));
      }
      // Category ids from another organisateur mean nothing here; names are kept.
      if (next.visibleSi) next.visibleSi = { categories: [], categoriesNoms: next.visibleSi.categoriesNoms || [] };
      return next;
    });

    const nom = await uniqueName(organisateurId, file.modele.nom);
    const modele = await ModeleBadge.create({
      ...file.modele,
      nom,
      elements,
      organisateurId,
      createdBy: userId,
      updatedBy: userId,
    });

    return {
      modele,
      resume: {
        partenairesCrees: crees,
        partenairesReutilises: reutilises,
        images: createdImageIds.length,
        renomme: nom !== file.modele.nom,
        variablesInconnues: templateUnknownVariables(file.modele.elements),
      },
    };
  } catch (error) {
    await Image.deleteMany({ _id: { $in: createdImageIds } });
    await Partenaire.deleteMany({ _id: { $in: createdPartenaireIds } });
    throw error;
  }
}

/** Event categories by name (case-insensitive) → ids, for imported templates' visibleSi. */
export async function resolveCategoryNames(elements, eventId) {
  const names = elements.flatMap((el) => el.visibleSi?.categoriesNoms || []);
  if (names.length === 0) return elements;
  const categories = await CategorieEvent.find({ eventId: new mongoose.Types.ObjectId(String(eventId)) }).select('nom');
  const byName = new Map(categories.map((c) => [c.nom.trim().toLowerCase(), c._id]));
  return elements.map((el) => {
    if (!el.visibleSi?.categoriesNoms?.length) return el;
    const ids = el.visibleSi.categoriesNoms.map((n) => byName.get(n.trim().toLowerCase())).filter(Boolean);
    return { ...el, visibleSi: ids.length ? { categories: ids } : null };
  });
}

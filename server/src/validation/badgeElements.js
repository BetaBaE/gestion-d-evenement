import { z } from 'zod';
import {
  hasElementType,
  getElementDefinition,
  ALLOWED_FONTS,
  COLOR_TOKENS,
} from '../../../shared/badge-renderer/index.js';

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale invalide.');

// Theme token or #RRGGBB — never free-form CSS, since these values end up
// in a style attribute rendered in the admin page and in Puppeteer.
const tokenOuHex = z.union([z.enum(COLOR_TOKENS), hexColor]);

const styleSchema = z
  .object({
    police: z.enum(ALLOWED_FONTS).optional(),
    tailleMax: z.number().min(4).max(96).optional(),
    tailleMin: z.number().min(4).max(96).optional(),
    graisse: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).optional(),
    italique: z.boolean().optional(),
    majuscules: z.boolean().optional(),
    couleur: tokenOuHex.optional(),
    fond: z.union([tokenOuHex, z.literal('aucun')]).optional(),
    degrade: z
      .object({ de: tokenOuHex, vers: tokenOuHex, angle: z.number().min(0).max(360) })
      .nullable()
      .optional(),
    bordure: z
      .object({ couleur: tokenOuHex, epaisseurMm: z.number().min(0).max(10) })
      .nullable()
      .optional(),
    rayonMm: z.number().min(0).max(200).optional(),
    opacite: z.number().min(0).max(1).optional(),
    alignH: z.enum(['gauche', 'centre', 'droite']).optional(),
    alignV: z.enum(['haut', 'milieu', 'bas']).optional(),
    interligne: z.number().min(0.5).max(3).optional(),
    espacementLettres: z.number().min(-5).max(20).optional(),
    lignesMax: z.number().int().min(1).max(20).optional(),
    paddingMm: z.number().min(0).max(50).optional(),
    dir: z.enum(['ltr', 'rtl', 'auto']).optional(),
  })
  .strict();

export const elementSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "Identifiant d'élément invalide."),
  nom: z.string().max(80).optional(),
  type: z.string().min(1),
  panneau: z.enum(['P1', 'P2', 'P3', 'P4']),
  x: z.number().min(-1000).max(1000),
  y: z.number().min(-1000).max(1000),
  largeur: z.number().positive().max(1000),
  hauteur: z.number().positive().max(1000),
  rotation: z.number().min(-360).max(360).optional().default(0),
  z: z.number().optional().default(0),
  verrouille: z.boolean().optional().default(false),
  masque: z.boolean().optional().default(false),
  groupeId: z.string().max(40).nullable().optional().default(null),
  visibleSi: z
    .object({ categories: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)) })
    .nullable()
    .optional()
    .default(null),
  props: z.record(z.string(), z.unknown()).optional().default({}),
  style: styleSchema.optional().default({}),
});

export const themeSchema = z.object({
  couleurPrincipale: hexColor.optional(),
  couleurSecondaire: hexColor.optional(),
  couleurAccent: hexColor.optional(),
  couleurTexte: hexColor.optional(),
  policeTitres: z.enum(ALLOWED_FONTS).optional(),
  policeTexte: z.enum(ALLOWED_FONTS).optional(),
  policeNom: z.enum(ALLOWED_FONTS).optional(),
});

/**
 * Per-type prop validation through the shared element registry (the zod
 * schema above only knows the common envelope). Returns error strings.
 */
export function validateElementTypes(elements) {
  const errors = [];
  (elements || []).forEach((el, index) => {
    if (!hasElementType(el.type)) {
      errors.push(`elements[${index}]: type d'élément inconnu "${el.type}"`);
      return;
    }
    const result = getElementDefinition(el.type).validateProps(el.props || {});
    if (!result.valid) {
      errors.push(`elements[${index}] (${el.type}): ${result.errors.join(', ')}`);
    }
  });
  const ids = new Set();
  (elements || []).forEach((el, index) => {
    if (ids.has(el.id)) errors.push(`elements[${index}]: identifiant en double "${el.id}"`);
    ids.add(el.id);
  });
  return errors;
}

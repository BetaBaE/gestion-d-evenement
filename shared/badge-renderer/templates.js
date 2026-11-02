import { nanoid } from './nanoid.js';

function bloc(type, props = {}, style = {}) {
  return { id: nanoid(), type, props, style };
}

/**
 * "Salon A4 plié en 4" — reproduces the reference badge layout: P1 badge
 * with header/name/QR/category band, P2 practical info, P3/P4 partner
 * panels with a promo box.
 */
export function salonA4Plie4Template() {
  return {
    format: 'A4_PLIE_4',
    rotationLigneBas180: false,
    traitsDePliage: true,
    panneaux: {
      P1: {
        actif: true,
        blocs: [
          bloc('enteteEvenement', {
            mode: 'genere',
            afficherDates: true,
            degrade: true,
          }),
          bloc('nomPrenom', { format: 'NOM Prénom' }, { alignement: 'centre', margeHaut: 'M' }),
          bloc('fonction', {}, { alignement: 'centre', margeBas: 'S' }),
          bloc('organisme', { afficher: 'nom' }, { alignement: 'centre', margeBas: 'M' }),
          bloc('qrCode', { tailleMm: 50 }, { alignement: 'centre', margeHaut: 'M' }),
          bloc('bandeCategorie', { texte: 'auto' }, { margeHaut: 'L' }),
        ],
      },
      P2: {
        actif: true,
        blocs: [
          bloc('titrePilule', { texte: 'INFORMATIONS PRATIQUES' }),
          bloc('listeInfos', { messageEnTete: '', items: [] }),
          bloc('horaires', { lignes: [] }),
          bloc('encadre', { texte: '', lien: '', style: 'contour' }),
          bloc('titrePilule', { texte: 'ORGANISATEUR' }, { margeHaut: 'M' }),
          bloc('logoOrganisateur', { taille: 'M' }, { alignement: 'centre' }),
        ],
      },
      P3: {
        actif: true,
        blocs: [bloc('enteteCompact', { afficherSiteWeb: true, afficherReseaux: false })],
      },
      P4: {
        actif: true,
        blocs: [bloc('encartPromo', { titre: '', pastille: '', texte: '', couleur: '#e8732c' })],
      },
    },
  };
}

/** "Badge simple A6" — P1 only, no partner panels. */
export function badgeSimpleA6Template() {
  return {
    format: 'A6',
    panneaux: {
      P1: {
        actif: true,
        blocs: [
          bloc('enteteEvenement', { mode: 'genere', afficherDates: true, degrade: true }),
          bloc('nomPrenom', { format: 'NOM Prénom' }, { alignement: 'centre', margeHaut: 'M' }),
          bloc('fonction', {}, { alignement: 'centre', margeBas: 'S' }),
          bloc('organisme', { afficher: 'nom' }, { alignement: 'centre', margeBas: 'M' }),
          bloc('qrCode', { tailleMm: 50 }, { alignement: 'centre', margeHaut: 'M' }),
          bloc('bandeCategorie', { texte: 'auto' }, { margeHaut: 'L' }),
        ],
      },
      P2: { actif: false, blocs: [] },
      P3: { actif: false, blocs: [] },
      P4: { actif: false, blocs: [] },
    },
  };
}

/** "Carte compacte" — P1 only, business-card size, minimal content. */
export function carteCompacteTemplate() {
  return {
    format: 'CARTE',
    carteLargeurMm: 85.6,
    carteHauteurMm: 54,
    panneaux: {
      P1: {
        actif: true,
        blocs: [
          bloc('nomPrenom', { format: 'NOM Prénom' }, { alignement: 'centre', margeHaut: 'S' }),
          bloc('fonction', {}, { alignement: 'centre' }),
          bloc('organisme', { afficher: 'nom' }, { alignement: 'centre', margeBas: 'S' }),
          bloc('qrCode', { tailleMm: 30 }, { alignement: 'centre' }),
          bloc('bandeCategorie', { texte: 'auto' }, { margeHaut: 'S' }),
        ],
      },
      P2: { actif: false, blocs: [] },
      P3: { actif: false, blocs: [] },
      P4: { actif: false, blocs: [] },
    },
  };
}

export const BUILTIN_TEMPLATES = {
  SALON_A4_PLIE_4: { label: 'Salon A4 plié en 4', build: salonA4Plie4Template },
  BADGE_SIMPLE_A6: { label: 'Badge simple A6', build: badgeSimpleA6Template },
  CARTE_COMPACTE: { label: 'Carte compacte', build: carteCompacteTemplate },
};

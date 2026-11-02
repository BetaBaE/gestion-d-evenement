import { nanoid } from './nanoid.js';

function el(type, panneau, geometry, props = {}, style = {}) {
  return {
    id: nanoid(),
    type,
    panneau,
    x: geometry.x,
    y: geometry.y,
    largeur: geometry.largeur,
    hauteur: geometry.hauteur,
    rotation: geometry.rotation || 0,
    z: geometry.z ?? 0,
    verrouille: false,
    masque: false,
    groupeId: null,
    visibleSi: null,
    props,
    style,
  };
}

const DEFAULT_THEME = {
  couleurPrincipale: '#1971c2',
  couleurSecondaire: '#dceefe',
  couleurAccent: '#e3a72f',
  couleurTexte: '#1f2a1f',
  policeTitres: 'Montserrat',
  policeTexte: 'Open Sans',
  policeNom: 'Merriweather',
};

/**
 * "Salon A4 plié en 4" — reproduces the Global Green Event reference
 * (Addendum 2): P1 badge (header band, name, QR, category band), P2
 * practical info, P3/P4 partner panels with a promo box.
 */
function salonA4Plie4() {
  const elements = [
    // P1 — badge (105 x 148.5mm, safe zone 5mm)
    el('forme', 'P1', { x: 0, y: 0, largeur: 105, hauteur: 32, z: 0 }, { forme: 'rectangle' }, { fond: 'secondaire', degrade: { de: 'secondaire', vers: '#ffffff', angle: 135 } }),
    el('texte', 'P1', { x: 8, y: 3, largeur: 89, hauteur: 7, z: 1 }, { contenu: '{{event.titre}}' }, { tailleMax: 12, tailleMin: 10, lignesMax: 1, graisse: 700, alignH: 'centre' }),
    el('texte', 'P1', { x: 8, y: 11, largeur: 89, hauteur: 5, z: 1 }, { contenu: '{{event.dates}}' }, { tailleMax: 9, tailleMin: 7, lignesMax: 1, alignH: 'centre' }),
    el('champ', 'P1', { x: 8, y: 55, largeur: 89, hauteur: 16, z: 1 }, { champ: 'nomPrenom', formatNom: 'Prénom NOM' }, { tailleMax: 16, tailleMin: 11, lignesMax: 2, graisse: 700, majuscules: true, alignH: 'centre' }),
    el('champ', 'P1', { x: 8, y: 72, largeur: 89, hauteur: 6, z: 1 }, { champ: 'fonction' }, { tailleMax: 10, tailleMin: 7, lignesMax: 1, alignH: 'centre' }),
    el('champ', 'P1', { x: 8, y: 79, largeur: 89, hauteur: 6, z: 1 }, { champ: 'organisme' }, { tailleMax: 9, tailleMin: 7, lignesMax: 1, majuscules: true, graisse: 700, couleur: 'accent', alignH: 'centre' }),
    el('qrCode', 'P1', { x: 30, y: 90, largeur: 45, hauteur: 45, z: 1 }, {}),
    el('bandeCategorie', 'P1', { x: 0, y: 138.5, largeur: 105, hauteur: 10, z: 1 }, { texte: 'auto' }, { fond: 'categorie', couleur: 'blanc', graisse: 700, majuscules: true, alignH: 'centre', alignV: 'milieu' }),

    // P2 — practical info
    el('texte', 'P2', { x: 5, y: 5, largeur: 50, hauteur: 7 }, { contenu: 'INFORMATIONS PRATIQUES' }, { tailleMax: 9, graisse: 700, majuscules: true, couleur: 'principale', fond: 'secondaire', rayonMm: 5, paddingMm: 1.5 }),
    el('texte', 'P2', { x: 5, y: 15, largeur: 95, hauteur: 10 }, { contenu: "Ce badge vous donne accès au salon pendant les {{event.nbJours}} jours de l'événement." }, { tailleMax: 7.5, italique: true, lignesMax: 2 }),
    el('icone', 'P2', { x: 5, y: 28, largeur: 4, hauteur: 4 }, { icone: 'calendrier' }, { couleur: 'principale' }),
    el('dates', 'P2', { x: 11, y: 27, largeur: 70, hauteur: 5 }, { format: 'long' }, { tailleMax: 7.5 }),
    el('icone', 'P2', { x: 5, y: 36, largeur: 4, hauteur: 4 }, { icone: 'lieu' }, { couleur: 'principale' }),
    el('texte', 'P2', { x: 11, y: 35, largeur: 85, hauteur: 7 }, { contenu: '{{event.lieu}}' }, { tailleMax: 7.5, lignesMax: 2 }),
    el('texte', 'P2', { x: 5, y: 110, largeur: 50, hauteur: 7 }, { contenu: 'ORGANISATEUR' }, { tailleMax: 9, graisse: 700, majuscules: true, couleur: 'principale', fond: 'secondaire', rayonMm: 5, paddingMm: 1.5 }),
    el('logoOrganisateur', 'P2', { x: 27.5, y: 120, largeur: 50, hauteur: 18 }, {}),

    // P3 — compact header + partners
    el('logoOrganisateur', 'P3', { x: 5, y: 5, largeur: 30, hauteur: 12 }, {}),
    el('texte', 'P3', { x: 38, y: 8, largeur: 62, hauteur: 6 }, { contenu: '{{organisateur.siteWeb}}' }, { tailleMax: 8, tailleMin: 6, lignesMax: 1, alignH: 'droite' }),
    el('grillePartenaires', 'P3', { x: 5, y: 25, largeur: 95, hauteur: 110 }, { partenaires: [], colonnes: 3, espacementMm: 2 }),

    // P4 — partners + promo box
    el('grillePartenaires', 'P4', { x: 5, y: 5, largeur: 95, hauteur: 95 }, { partenaires: [], colonnes: 3, espacementMm: 2 }),
    el('forme', 'P4', { x: 5, y: 105, largeur: 95, hauteur: 35, z: 0 }, { forme: 'rectangle' }, { fond: '#e8732c', rayonMm: 2 }),
    el('texte', 'P4', { x: 9, y: 109, largeur: 87, hauteur: 7, z: 1 }, { contenu: 'Organisez votre déplacement' }, { tailleMax: 9, graisse: 700, couleur: 'blanc' }),
    el('texte', 'P4', { x: 9, y: 117, largeur: 87, hauteur: 12, z: 1 }, { contenu: 'Bénéficiez de réductions sur présentation de votre badge.' }, { tailleMax: 7, couleur: 'blanc', lignesMax: 3 }),
  ];

  return {
    format: 'A4_PLIE_4',
    carteLargeurMm: 85.6,
    carteHauteurMm: 54,
    rotationLigneBas180: false,
    traitsDePliage: true,
    safeZoneMm: 5,
    theme: { ...DEFAULT_THEME },
    elements,
  };
}

/** "Badge A6 simple" — P1 only, no partner panels. */
function badgeA6Simple() {
  const elements = [
    el('champ', 'P1', { x: 8, y: 30, largeur: 89, hauteur: 16 }, { champ: 'nomPrenom', formatNom: 'Prénom NOM' }, { tailleMax: 16, tailleMin: 11, lignesMax: 2, graisse: 700, majuscules: true, alignH: 'centre' }),
    el('champ', 'P1', { x: 8, y: 47, largeur: 89, hauteur: 6 }, { champ: 'fonction' }, { tailleMax: 10, tailleMin: 7, lignesMax: 1, alignH: 'centre' }),
    el('champ', 'P1', { x: 8, y: 54, largeur: 89, hauteur: 6 }, { champ: 'organisme' }, { tailleMax: 9, tailleMin: 7, lignesMax: 1, majuscules: true, graisse: 700, couleur: 'accent', alignH: 'centre' }),
    el('qrCode', 'P1', { x: 30, y: 65, largeur: 45, hauteur: 45 }, {}),
    el('bandeCategorie', 'P1', { x: 0, y: 138.5, largeur: 105, hauteur: 10 }, { texte: 'auto' }, { fond: 'categorie', couleur: 'blanc', graisse: 700, majuscules: true, alignH: 'centre', alignV: 'milieu' }),
  ];

  return {
    format: 'A6',
    carteLargeurMm: 85.6,
    carteHauteurMm: 54,
    rotationLigneBas180: false,
    traitsDePliage: false,
    safeZoneMm: 5,
    theme: { ...DEFAULT_THEME },
    elements,
  };
}

/** "Carte compacte 85.6 x 54" — business-card size, minimal content. */
function carteCompacte() {
  const elements = [
    el('champ', 'P1', { x: 4, y: 3, largeur: 77.6, hauteur: 8 }, { champ: 'nomPrenom', formatNom: 'Prénom NOM' }, { tailleMax: 11, tailleMin: 8, lignesMax: 1, graisse: 700, alignH: 'centre' }),
    el('champ', 'P1', { x: 4, y: 11, largeur: 77.6, hauteur: 5 }, { champ: 'fonction' }, { tailleMax: 8, tailleMin: 6, lignesMax: 1, alignH: 'centre' }),
    el('qrCode', 'P1', { x: 27.8, y: 16.5, largeur: 30, hauteur: 30 }, {}),
    el('bandeCategorie', 'P1', { x: 0, y: 47, largeur: 85.6, hauteur: 7 }, { texte: 'auto' }, { fond: 'categorie', couleur: 'blanc', graisse: 700, majuscules: true, alignH: 'centre', alignV: 'milieu' }),
  ];

  return {
    format: 'CARTE',
    carteLargeurMm: 85.6,
    carteHauteurMm: 54,
    rotationLigneBas180: false,
    traitsDePliage: false,
    safeZoneMm: 3,
    theme: { ...DEFAULT_THEME },
    elements,
  };
}

export const STARTER_TEMPLATES = {
  SALON_A4_PLIE_4: { label: 'Salon A4 plié en 4', build: salonA4Plie4 },
  BADGE_A6_SIMPLE: { label: 'Badge A6 simple', build: badgeA6Simple },
  CARTE_COMPACTE: { label: 'Carte compacte 85.6 × 54', build: carteCompacte },
};

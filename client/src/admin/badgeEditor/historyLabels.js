// Names of history steps, shown in the undo / redo tooltips ("Annuler : couleur du texte").

const STYLE_LABELS = {
  couleur: 'couleur du texte',
  fond: 'couleur de fond',
  degrade: 'dégradé',
  bordure: 'bordure',
  rayonMm: 'arrondi',
  opacite: 'opacité',
  paddingMm: 'marge intérieure',
  police: 'police',
  tailleMax: 'taille du texte',
  tailleMin: 'taille minimale',
  graisse: 'graisse',
  italique: 'italique',
  majuscules: 'majuscules',
  interligne: 'interligne',
  lignesMax: 'lignes max',
  espacementLettres: 'espacement des lettres',
  alignH: 'alignement',
  alignV: 'alignement',
  dir: "sens d'écriture",
};

const ELEMENT_LABELS = {
  x: 'position',
  y: 'position',
  largeur: 'taille',
  hauteur: 'taille',
  rotation: 'rotation',
  panneau: 'panneau',
  nom: 'nom du calque',
  verrouille: 'verrouillage',
  masque: 'masquage',
  visibleSi: 'visibilité par catégorie',
};

const PROPS_LABELS = { contenu: 'contenu du texte', champ: 'champ', icone: 'icône', imageId: 'image', partenaires: 'partenaires' };

const THEME_LABELS = {
  couleurPrincipale: 'couleur principale',
  couleurSecondaire: 'couleur secondaire',
  couleurAccent: "couleur d'accent",
  couleurTexte: 'couleur du texte (thème)',
  policeTitres: 'police des titres',
  policeTexte: 'police du texte',
  policeNom: 'police du nom',
};

/** Label of an element patch: { style: { couleur } } → "couleur du texte". */
export function elementPatchLabel(patch, el) {
  if (patch.style) {
    const changed = Object.keys(patch.style).filter((k) => JSON.stringify(patch.style[k]) !== JSON.stringify(el?.style?.[k]));
    const key = changed[0];
    if (key === 'couleur' && el?.type === 'icone') return "couleur de l'icône";
    return STYLE_LABELS[key] || 'style';
  }
  if (patch.props) {
    const changed = Object.keys(patch.props).filter((k) => JSON.stringify(patch.props[k]) !== JSON.stringify(el?.props?.[k]));
    return PROPS_LABELS[changed[0]] || 'propriétés';
  }
  const key = Object.keys(patch)[0];
  return ELEMENT_LABELS[key] || 'modification';
}

export function themePatchLabel(patch) {
  const key = Object.keys(patch)[0];
  return `thème : ${THEME_LABELS[key] || key}`;
}

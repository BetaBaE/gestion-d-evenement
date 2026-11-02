const MARGIN_MM = { aucune: 0, S: 1.5, M: 3, L: 5 };
const TEXT_SIZE_MM = { S: 2.4, M: 3, L: 3.8, XL: 5.5 };

/**
 * Translates a block's limited style object (§2.1 of the addendum — no
 * arbitrary CSS, only theme-relative choices) into an inline style string.
 */
export function blockStyleToCss(style, theme) {
  const s = style || {};
  const rules = [];

  if (s.alignement === 'centre') rules.push('text-align:center');
  else if (s.alignement === 'droite') rules.push('text-align:right');
  else rules.push('text-align:left');

  const marginTop = MARGIN_MM[s.margeHaut] ?? MARGIN_MM.aucune;
  const marginBottom = MARGIN_MM[s.margeBas] ?? MARGIN_MM.M;
  rules.push(`margin-top:${marginTop}mm`, `margin-bottom:${marginBottom}mm`);

  const bgMap = {
    principale: theme.couleurPrincipale,
    secondaire: theme.couleurSecondaire,
    accent: theme.couleurAccent,
  };
  if (s.couleurFond && s.couleurFond !== 'aucune' && bgMap[s.couleurFond]) {
    rules.push(`background:${bgMap[s.couleurFond]}`);
  }

  const textMap = {
    principale: theme.couleurPrincipale,
    accent: theme.couleurAccent,
    texte: theme.couleurTexte,
    blanc: '#ffffff',
  };
  if (s.couleurTexte && s.couleurTexte !== 'auto' && textMap[s.couleurTexte]) {
    rules.push(`color:${textMap[s.couleurTexte]}`);
  }

  return rules.join(';');
}

export function textSizeMm(taille) {
  return TEXT_SIZE_MM[taille] ?? TEXT_SIZE_MM.M;
}

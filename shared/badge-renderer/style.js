const ALIGN_H_CSS = { gauche: 'flex-start', centre: 'center', droite: 'flex-end' };
const ALIGN_V_CSS = { haut: 'flex-start', milieu: 'center', bas: 'flex-end' };
const TEXT_ALIGN_CSS = { gauche: 'left', centre: 'center', droite: 'right' };

function resolveToken(tokenOuHex, theme, categorieColor) {
  if (!tokenOuHex || tokenOuHex === 'aucun') return null;
  if (tokenOuHex.startsWith('#')) return tokenOuHex;
  if (tokenOuHex === 'categorie') return categorieColor || theme.couleurPrincipale;
  const map = {
    principale: theme.couleurPrincipale,
    secondaire: theme.couleurSecondaire,
    accent: theme.couleurAccent,
    texte: theme.couleurTexte,
    blanc: '#ffffff',
    noir: '#000000',
  };
  return map[tokenOuHex] || tokenOuHex;
}

/**
 * Translates an element's Style object (Addendum 3 v2 §2.2) into inline
 * CSS for its wrapper div. Font family/size/line-height for text content
 * is handled separately by the text-fit output, not here — this only
 * covers the parts that are the same regardless of text fitting.
 */
export function styleToCss(style, theme, categorieColor) {
  const s = style || {};
  const rules = [];

  const couleur = resolveToken(s.couleur, theme, categorieColor);
  if (couleur) rules.push(`color:${couleur}`);

  if (s.degrade) {
    const de = resolveToken(s.degrade.de, theme, categorieColor);
    const vers = resolveToken(s.degrade.vers, theme, categorieColor);
    rules.push(`background:linear-gradient(${s.degrade.angle ?? 135}deg, ${de}, ${vers})`);
  } else {
    const fond = resolveToken(s.fond, theme, categorieColor);
    if (fond) rules.push(`background:${fond}`);
  }

  if (s.bordure) {
    const couleurBordure = resolveToken(s.bordure.couleur, theme, categorieColor);
    rules.push(`border:${s.bordure.epaisseurMm ?? 0.3}mm solid ${couleurBordure}`);
  }

  if (s.rayonMm !== undefined) rules.push(`border-radius:${s.rayonMm}mm`);
  if (s.opacite !== undefined) rules.push(`opacity:${s.opacite}`);
  if (s.paddingMm !== undefined) rules.push(`padding:${s.paddingMm}mm`);

  rules.push('display:flex');
  rules.push(`justify-content:${ALIGN_H_CSS[s.alignH] || 'flex-start'}`);
  rules.push(`align-items:${ALIGN_V_CSS[s.alignV] || 'flex-start'}`);
  rules.push(`text-align:${TEXT_ALIGN_CSS[s.alignH] || 'left'}`);

  if (s.espacementLettres !== undefined) rules.push(`letter-spacing:${s.espacementLettres}px`);
  if (s.majuscules) rules.push('text-transform:uppercase');
  if (s.graisse) rules.push(`font-weight:${s.graisse}`);
  if (s.italique) rules.push('font-style:italic');
  if (s.police) rules.push(`font-family:'${s.police}', 'Segoe UI', Arial, sans-serif`);
  if (s.dir && s.dir !== 'auto') rules.push(`direction:${s.dir}`);

  return rules.join(';');
}

export { resolveToken };

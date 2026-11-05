import { activePanelKeys, elementsHorsPage } from './panels.js';
import { unknownVariables } from './variables.js';

const NAME_FIELDS = ['nomPrenom', 'nom'];

/**
 * Checks a badge (or template) before it can be used for an event.
 *
 * Returns a list of { code, niveau: 'bloquant' | 'avertissement', message,
 * correction? } — `correction` ({ type, props }) is the element a one-click
 * "Ajouter" button creates on P1. Only elements that actually print count
 * (not hidden, on an active panel).
 */
export function checkBadgeRules(badge) {
  const active = activePanelKeys(badge);
  const printed = (badge?.elements || []).filter((el) => !el.masque && active.includes(el.panneau));
  const results = [];

  if (!printed.some((el) => el.type === 'champ' && NAME_FIELDS.includes(el.props?.champ))) {
    results.push({
      code: 'NOM_MANQUANT',
      niveau: 'bloquant',
      message: 'Ajouter le nom du participant',
      correction: { type: 'champ', props: { champ: 'nomPrenom' } },
    });
  }

  const qrCodes = printed.filter((el) => el.type === 'qrCode');
  if (qrCodes.length === 0) {
    results.push({
      code: 'QR_MANQUANT',
      niveau: 'bloquant',
      message: 'Ajouter le QR code',
      correction: { type: 'qrCode', props: {} },
    });
  } else if (badge.format === 'A4_PLIE_4' && !qrCodes.some((el) => el.panneau === 'P1')) {
    results.push({
      code: 'QR_HORS_P1',
      niveau: 'avertissement',
      message: 'Le QR code doit être sur P1 (la face visible une fois plié) pour être scanné à l’entrée.',
    });
  }

  results.push(...geometryRules(badge, printed));

  // A {{variable}} the registry doesn't know (typo, imported template) would print nothing.
  printed
    .filter((el) => el.type === 'texte')
    .forEach((el) => {
      const unknown = unknownVariables(el.props?.contenu);
      if (unknown.length === 0) return;
      results.push({
        code: 'VARIABLE_INCONNUE',
        niveau: 'bloquant',
        elementId: el.id,
        message: `Variable inconnue ${unknown.map((k) => `{{${k}}}`).join(', ')} dans « ${el.nom || 'Texte'} » (${el.panneau}) : remplacez-la depuis « Insérer une variable ».`,
      });
    });

  const horsPage = elementsHorsPage(badge);
  if (horsPage.length > 0) {
    results.push({
      code: 'HORS_PAGE',
      niveau: 'avertissement',
      message: `${horsPage.length} élément(s) hors page : ils ne seront pas imprimés.`,
    });
  }

  return results;
}

export const QR_MIN_MM = 30;
export const QR_RECOMMANDE_MM = 45;
export const QR_COUVERT_MAX = 0.05; // share of the QR area above which it can't be scanned
export const TAILLE_MIN_PT = 6;
export const NOM_RECOMMANDE_PT = 12;

// Backgrounds and full-bleed bands may run to the edge; content may not.
const BLEED_TYPES = ['forme', 'bandeCategorie', 'image'];
const TEXT_TYPES = ['texte', 'champ', 'dates', 'bandeCategorie'];

function panelSize(badge) {
  if (badge?.format === 'CARTE') return { width: badge.carteLargeurMm || 85.6, height: badge.carteHauteurMm || 54 };
  return { width: 105, height: 148.5 };
}

const hasBox = (el) => [el.x, el.y, el.largeur, el.hauteur].every(Number.isFinite);
const round = (n) => Math.round(n * 10) / 10;

function overlapArea(a, b) {
  const w = Math.min(a.x + a.largeur, b.x + b.largeur) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.hauteur, b.y + b.hauteur) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** QR size / squareness / coverage, one QR on P1, safe zone, minimum text sizes. */
function geometryRules(badge, printed) {
  const results = [];
  const qrs = printed.filter((el) => el.type === 'qrCode');

  if (qrs.filter((el) => el.panneau === 'P1').length > 1) {
    results.push({ code: 'QR_MULTIPLE', niveau: 'bloquant', message: 'Un seul QR code sur P1 : le scan à l’entrée ne saurait pas lequel lire.' });
  }

  qrs.filter(hasBox).forEach((qr) => {
    const side = Math.min(qr.largeur, qr.hauteur);
    if (Math.abs(qr.largeur - qr.hauteur) > 0.5) {
      results.push({ code: 'QR_NON_CARRE', niveau: 'bloquant', elementId: qr.id, message: `Le QR code doit être carré (${round(qr.largeur)} × ${round(qr.hauteur)} mm).` });
    }
    if (side < QR_MIN_MM) {
      results.push({ code: 'QR_TROP_PETIT', niveau: 'bloquant', elementId: qr.id, message: `QR code de ${round(side)} mm : ${QR_MIN_MM} mm minimum pour être scanné.` });
    } else if (side < QR_RECOMMANDE_MM) {
      results.push({ code: 'QR_PETIT', niveau: 'avertissement', elementId: qr.id, message: `QR code de ${round(side)} mm : ${QR_RECOMMANDE_MM} mm recommandés pour un scan rapide.` });
    }
    // Elements drawn above the QR. A small logo in the middle (a few % of the
    // code) is a common design that error correction absorbs: warning only.
    const above = printed.filter((el) => el !== qr && el.panneau === qr.panneau && hasBox(el) && (el.z ?? 0) > (qr.z ?? 0) && overlapArea(el, qr) > 0.5);
    const covered = above.reduce((sum, el) => sum + overlapArea(el, qr), 0) / (qr.largeur * qr.hauteur);
    if (above.length && covered >= QR_COUVERT_MAX) {
      results.push({ code: 'QR_COUVERT', niveau: 'bloquant', elementId: qr.id, message: `Le QR code est recouvert par « ${above[0].nom || above[0].type} » : il ne pourrait pas être scanné.` });
    } else if (above.length) {
      results.push({
        code: 'QR_PARTIELLEMENT_COUVERT',
        niveau: 'avertissement',
        elementId: qr.id,
        message: `« ${above[0].nom || above[0].type} » recouvre ${Math.max(1, Math.round(covered * 100))} % du QR code : vérifiez qu’il se scanne.`,
      });
    }
  });

  const safe = badge?.safeZoneMm ?? 5;
  const { width, height } = panelSize(badge);
  const outside = printed.filter(
    (el) =>
      !BLEED_TYPES.includes(el.type) &&
      hasBox(el) &&
      !el.rotation &&
      (el.x < safe - 0.05 || el.y < safe - 0.05 || el.x + el.largeur > width - safe + 0.05 || el.y + el.hauteur > height - safe + 0.05),
  );
  if (outside.length > 0) {
    results.push({
      code: 'HORS_ZONE_SURE',
      niveau: 'avertissement',
      elementId: outside[0].id,
      message: `${outside.length} élément(s) dépassent la zone de sécurité (${safe} mm du bord) : ils risquent d’être coupés à l’impression.`,
    });
  }

  const tooSmall = printed.filter((el) => TEXT_TYPES.includes(el.type) && el.style?.tailleMin !== undefined && el.style.tailleMin < TAILLE_MIN_PT);
  if (tooSmall.length > 0) {
    results.push({
      code: 'TEXTE_TROP_PETIT',
      niveau: 'avertissement',
      elementId: tooSmall[0].id,
      message: `${tooSmall.length} texte(s) peuvent descendre sous ${TAILLE_MIN_PT} pt : illisible une fois imprimé.`,
    });
  }

  const nom = printed.find((el) => el.panneau === 'P1' && el.type === 'champ' && NAME_FIELDS.includes(el.props?.champ));
  const nomMin = nom?.style?.tailleMin;
  if (nom && nomMin !== undefined && nomMin < NOM_RECOMMANDE_PT) {
    results.push({
      code: 'NOM_PETIT',
      niveau: 'avertissement',
      elementId: nom.id,
      message: `Le nom peut descendre à ${nomMin} pt : ${NOM_RECOMMANDE_PT} pt recommandés pour être lu de loin.`,
    });
  }
  return results;
}

export function hasBlockingRules(badge) {
  return checkBadgeRules(badge).some((r) => r.niveau === 'bloquant');
}

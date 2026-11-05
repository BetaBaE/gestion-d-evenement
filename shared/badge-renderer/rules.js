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

export function hasBlockingRules(badge) {
  return checkBadgeRules(badge).some((r) => r.niveau === 'bloquant');
}

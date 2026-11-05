/**
 * Bulk actions on participants: which ones each action applies to, and why
 * the others are skipped (pure, unit tested). Skipped participants are never
 * an error: "37 sélectionnés → 34 seront validés · 3 déjà validés (ignorés)".
 */

export const BULK_ACTIONS = {
  VALIDER_ENVOYER: { libelle: 'Valider et envoyer le badge', verbe: 'seront validés (badge envoyé)', email: 'BADGE' },
  VALIDER: { libelle: 'Valider sans envoyer', verbe: 'seront validés' },
  REFUSER: { libelle: 'Refuser', verbe: 'seront refusés' },
  CHANGER_CATEGORIE: { libelle: 'Changer la catégorie', verbe: 'changeront de catégorie' },
  RENVOYER_EMAIL: { libelle: "Renvoyer l'email", verbe: 'recevront de nouveau l’email', email: 'option' },
  EXPORTER: { libelle: 'Exporter (Excel)', verbe: 'seront exportés' },
  SUPPRIMER: { libelle: 'Supprimer', verbe: 'seront supprimés' },
  IMPRIMER: { libelle: 'Imprimer les badges', verbe: 'seront imprimés' },
};

/**
 * { ok: true } or { ok: false, raison } for one participant.
 * ctx: { options, scannes: Set<participantId> }
 */
export function eligibility(action, p, ctx = {}) {
  const options = ctx.options || {};
  const skip = (raison) => ({ ok: false, raison });
  switch (action) {
    case 'VALIDER_ENVOYER':
    case 'VALIDER':
      if (p.statut === 'VALIDE') return skip('déjà validés');
      if (p.statut === 'REFUSE') return skip('refusés');
      if (action === 'VALIDER_ENVOYER' && !p.email) return skip('sans email');
      return { ok: true };
    case 'REFUSER':
      if (p.statut === 'REFUSE') return skip('déjà refusés');
      return { ok: true };
    case 'CHANGER_CATEGORIE':
      if (!options.categorieId) return skip('catégorie non choisie');
      if (String(p.categorieId) === String(options.categorieId)) return skip('déjà dans cette catégorie');
      return { ok: true };
    case 'RENVOYER_EMAIL':
      if (!p.email) return skip('sans email');
      if (options.type === 'BADGE' && p.statut !== 'VALIDE') return skip('non validés (pas de badge)');
      if (p.statut === 'REFUSE') return skip('refusés');
      return { ok: true };
    case 'IMPRIMER':
      if (p.statut !== 'VALIDE' && !options.inclureNonValides) return skip('non validés');
      if (options.seulementJamaisImprimes && (p.nbImpressionsBadge || 0) > 0) return skip('déjà imprimés');
      return { ok: true };
    case 'SUPPRIMER':
      if (ctx.scannes?.has(String(p._id))) return skip('déjà scannés à l’entrée');
      return { ok: true };
    case 'EXPORTER':
      return { ok: true };
    default:
      return skip('action inconnue');
  }
}

/** Counts for the confirmation dialog. */
export function summarize(action, participants, ctx = {}) {
  const ignores = new Map();
  let eligibles = 0;
  let dejaImprimes = 0;
  participants.forEach((p) => {
    const r = eligibility(action, p, ctx);
    if (r.ok) {
      eligibles += 1;
      if ((p.nbImpressionsBadge || 0) > 0) dejaImprimes += 1;
    } else {
      ignores.set(r.raison, (ignores.get(r.raison) || 0) + 1);
    }
  });
  const sendsEmail = BULK_ACTIONS[action]?.email;
  return {
    action,
    total: participants.length,
    eligibles,
    ignores: [...ignores.entries()].map(([raison, n]) => ({ raison, n })),
    emails: sendsEmail ? eligibles : 0,
    dejaImprimes: action === 'IMPRIMER' ? dejaImprimes : 0,
  };
}

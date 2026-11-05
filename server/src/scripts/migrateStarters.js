/**
 * npm run migrate:starters [-- --apply]
 *
 * Replaces the old starter templates (3 defined in code + "Grille modulaire")
 * by the 4 new ones (shared/badge-renderer/starters). Dry run by default:
 * prints the report and changes nothing; --apply runs it.
 *
 * - Organisateur templates created from an OLD starter and never modified
 *   are archived (never deleted). Reliable only with a provenance marker:
 *   starterKey of an old starter and version 1 (every save increments it).
 * - Templates without a marker — everything created before starterKey was
 *   recorded — have an unknown provenance: they are KEPT and listed. Those
 *   that carry the name of an old starter are flagged
 *   "à vérifier": a person decides, the script never guesses.
 * - Templates created or modified by users are left untouched.
 * - Events keep their badge (their own copy): nothing published changes.
 * - An organisateur whose default template gets archived gets "Signal"
 *   (a copy of the starter) as its new default.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { ModeleBadge } from '../models/ModeleBadge.js';
import { Organisateur } from '../models/Organisateur.js';
import { STARTER_TEMPLATES, DEFAULT_STARTER_KEY } from '../../../shared/badge-renderer/index.js';

const APPLY = process.argv.includes('--apply');
const OLD_STARTER_KEYS = ['SALON_A4_PLIE_4', 'BADGE_A6_SIMPLE', 'CARTE_COMPACTE', 'GRILLE_MODULAIRE'];
const OLD_STARTER_NAMES = ['salon a4 plié en 4', 'badge a6 simple', 'carte compacte 85.6 × 54', 'grille modulaire'];

const normalize = (s) => String(s || '').trim().toLowerCase();

function classify(m) {
  if (m.starterKey && OLD_STARTER_KEYS.includes(m.starterKey)) {
    return m.version === 1
      ? { action: 'ARCHIVER', raison: `créé depuis l'ancien modèle de départ ${m.starterKey}, jamais modifié` }
      : { action: 'GARDER', raison: `créé depuis ${m.starterKey} puis modifié (v${m.version})` };
  }
  if (m.starterKey) return { action: 'GARDER', raison: `nouveau modèle de départ (${m.starterKey})` };
  if (OLD_STARTER_NAMES.includes(normalize(m.nom))) {
    return {
      action: 'A_VERIFIER',
      raison: `porte le nom d'un ancien modèle de départ, provenance non enregistrée (v${m.version}${m.version === 1 ? ', jamais modifié' : ', modifié'}) — gardé`,
    };
  }
  return { action: 'GARDER', raison: 'créé ou importé par un utilisateur' };
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  const modeles = await ModeleBadge.find({ archive: { $ne: true } }).select('nom organisateurId starterKey version parDefaut').lean();
  const organisateurs = await Organisateur.find({ _id: { $in: [...new Set(modeles.map((m) => String(m.organisateurId)))] } }).select('nom').lean();
  const orgName = new Map(organisateurs.map((o) => [String(o._id), o.nom]));
  const byOrg = new Map();
  modeles.forEach((m) => {
    const key = String(m.organisateurId);
    if (!byOrg.has(key)) byOrg.set(key, []);
    byOrg.get(key).push({ ...m, ...classify(m) });
  });

  console.log(`Migration des modèles de départ — ${APPLY ? 'APPLICATION' : 'SIMULATION (--dry-run, rien n’est modifié)'}`);
  console.log(`Nouveaux modèles de départ : ${Object.values(STARTER_TEMPLATES).map((s) => `${s.label} (${s.key} v${s.starterVersion})`).join(', ')}`);
  console.log('Les badges des événements ne sont pas modifiés (chaque événement a sa propre copie).\n');

  const totals = { archives: 0, gardes: 0, aVerifier: 0, nouveauxDefauts: 0 };
  for (const [orgId, list] of byOrg) {
    const archived = list.filter((m) => m.action === 'ARCHIVER');
    const defaultArchived = archived.some((m) => m.parDefaut);
    console.log(`■ ${orgName.get(orgId) || orgId}`);
    for (const m of list) {
      const tag = { ARCHIVER: 'archivé   ', GARDER: 'gardé     ', A_VERIFIER: 'à vérifier' }[m.action];
      console.log(`   ${tag}  « ${m.nom} »${m.parDefaut ? ' [par défaut]' : ''} — ${m.raison}`);
    }
    console.log(`   nouveau modèle par défaut : ${defaultArchived ? `« ${STARTER_TEMPLATES[DEFAULT_STARTER_KEY].label} »` : 'inchangé'}`);
    totals.archives += archived.length;
    totals.gardes += list.length - archived.length;
    totals.aVerifier += list.filter((m) => m.action === 'A_VERIFIER').length;
    if (defaultArchived) totals.nouveauxDefauts += 1;

    if (APPLY && archived.length) {
      await ModeleBadge.updateMany({ _id: { $in: archived.map((m) => m._id) } }, { $set: { archive: true, parDefaut: false } });
      if (defaultArchived) {
        const starter = STARTER_TEMPLATES[DEFAULT_STARTER_KEY];
        let nom = starter.label;
        // eslint-disable-next-line no-await-in-loop
        while (await ModeleBadge.exists({ organisateurId: orgId, nom, archive: { $ne: true } })) nom = `${nom} (modèle de départ)`;
        await ModeleBadge.create({
          ...starter.build(),
          nom,
          description: starter.description,
          organisateurId: orgId,
          starterKey: starter.key,
          starterVersion: starter.starterVersion,
          parDefaut: true,
        });
      }
    }
    console.log('');
  }
  console.log(
    `Total : ${totals.archives} archivé(s), ${totals.gardes} gardé(s) dont ${totals.aVerifier} à vérifier, ${totals.nouveauxDefauts} nouveau(x) modèle(s) par défaut.`,
  );
  if (totals.aVerifier) {
    console.log('« À vérifier » : provenance non enregistrée — rien n’est archivé automatiquement. Archivez-les depuis « Modèles de badge » si besoin.');
  }
} finally {
  await mongoose.disconnect();
}

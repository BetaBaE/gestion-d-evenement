import { registerJobHandler } from '../jobQueue.js';
import { Job } from '../../models/Job.js';
import { Event } from '../../models/Event.js';
import { Participant } from '../../models/Participant.js';
import { InvitedOrganism } from '../../models/InvitedOrganism.js';
import { eligibility } from '../../services/bulkRules.js';
import { generateBatchBadgesPdf, loadBadgeEntries } from '../../services/badgeService.js';
import { saveFile, readFile, deleteFile, findJobFiles } from '../../services/fileStore.js';
import { assemblePrintPdf } from '../../services/printAssembly.js';
import { planParts } from '../../services/printPlan.js';
import { panelSizeMm } from '../../../../shared/badge-renderer/index.js';

const FILE_TTL_MS = 24 * 60 * 60 * 1000;
// Vercel functions answer at most 4.5 MB: split the PDF into parts that download.
const PART_LIMIT = process.env.VERCEL ? 4 * 1024 * 1024 : Infinity;

const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);

/**
 * Bulk badge printing. Items are already in print order (sorted when the job
 * was created). Each batch renders its badges with Puppeteer into a chunk PDF
 * kept in GridFS (keyed by its position: a batch run again replaces its own
 * chunk); finalize merges the chunks with pdf-lib — separator pages, A4
 * imposition with cut marks, parts small enough to download — and only then
 * marks the badges as printed.
 */
async function processBatch(job, ids) {
  const { options = {} } = job.params;
  const index = job.position;
  const event = await Event.findById(job.eventId);
  const found = await Participant.find({ _id: { $in: ids }, eventId: job.eventId });
  const byId = new Map(found.map((p) => [String(p._id), p]));
  // Still printable now? (status may have changed since the job was created)
  const printable = ids.map((id) => byId.get(String(id))).filter((p) => p && eligibility('IMPRIMER', p, { options }).ok);

  for (const old of await findJobFiles(job._id, { chunk: index })) await deleteFile(old._id);
  if (printable.length) {
    const buffer = await generateBatchBadgesPdf(await loadBadgeEntries(event, printable));
    await saveFile(buffer, {
      filename: `chunk-${index}.pdf`,
      contentType: 'application/pdf',
      expireLe: new Date(Date.now() + FILE_TTL_MS),
      organisateurId: job.organisateurId,
      jobId: job._id,
      extra: { chunk: index, ids: printable.map((p) => String(p._id)) },
    });
  }
  const done = new Set(printable.map((p) => String(p._id)));
  return ids.map((id) => ({ id, statut: done.has(String(id)) ? 'ok' : 'ignore' }));
}

async function finalize(job) {
  const fresh = await Job.findById(job._id);
  if (fresh.etat?.finalise) return;
  const { options = {} } = fresh.params;
  const chunks = (await findJobFiles(job._id)).filter((f) => Number.isInteger(f.metadata.chunk)).sort((a, b) => a.metadata.chunk - b.metadata.chunk);
  const printedIds = chunks.flatMap((c) => c.metadata.ids);

  if (printedIds.length === 0) {
    await Job.updateOne({ _id: job._id }, { $set: { 'etat.finalise': true, 'resultat.message': 'Aucun badge à imprimer.' } });
    return;
  }

  const event = await Event.findById(job.eventId);
  const participants = await Participant.find({ _id: { $in: printedIds } }).select('invitedOrganismId').lean();
  const orgKey = new Map(participants.map((p) => [String(p._id), String(p.invitedOrganismId)]));
  const organismes = await InvitedOrganism.find({ _id: { $in: [...new Set(orgKey.values())] } }).select('nom').lean();
  const orgName = new Map(organismes.map((o) => [String(o._id), o.nom]));
  const groupCounts = new Map();
  printedIds.forEach((id) => groupCounts.set(orgKey.get(id), (groupCounts.get(orgKey.get(id)) || 0) + 1));
  const organismeOf = (id) => ({ key: orgKey.get(id), nom: orgName.get(orgKey.get(id)) || 'Organisme inconnu' });
  const planche = !!options.planche && event.badge?.format === 'CARTE';

  const parts = planParts(chunks.map((c) => c.length), PART_LIMIT);
  const expireLe = new Date(Date.now() + FILE_TTL_MS);
  const base = `badges-${slug(event.titre) || 'evenement'}`;
  const fichiers = [];
  for (const [n, part] of parts.entries()) {
    const buffers = await Promise.all(part.map((i) => readFile(chunks[i]._id)));
    const pdf = await assemblePrintPdf(
      part.map((i, k) => ({ buffer: buffers[k], ids: chunks[i].metadata.ids })),
      { separateurs: !!options.separateurs, planche, organismeOf, groupCounts, cardMm: panelSizeMm(event.badge || {}) },
    );
    fichiers.push(
      await saveFile(pdf, {
        filename: parts.length > 1 ? `${base}-partie-${n + 1}-sur-${parts.length}.pdf` : `${base}.pdf`,
        contentType: 'application/pdf',
        expireLe,
        organisateurId: job.organisateurId,
        jobId: job._id,
      }),
    );
  }

  // Printed = the PDF exists. Flag first, so a finalize run again after a crash never counts twice.
  const mark = await Job.updateOne({ _id: job._id, 'etat.marque': { $ne: true } }, { $set: { 'etat.marque': true } });
  if (mark.modifiedCount) {
    await Participant.updateMany({ _id: { $in: printedIds } }, { $inc: { nbImpressionsBadge: 1 }, $set: { derniereImpressionLe: new Date() } });
  }
  for (const c of chunks) await deleteFile(c._id);

  const n = printedIds.length;
  await Job.updateOne(
    { _id: job._id },
    {
      $set: {
        'etat.finalise': true,
        'resultat.fichiers': fichiers,
        'resultat.expireLe': expireLe,
        'resultat.message': `${n} badge${n > 1 ? 's' : ''} prêt${n > 1 ? 's' : ''} à imprimer${fichiers.length > 1 ? ` en ${fichiers.length} fichiers` : ''}.`,
      },
    },
  );
}

// Smaller batches on Vercel (slower Chromium): a step + finalize stays well inside maxDuration (60 s).
registerJobHandler('PRINT_BADGES', { batchSize: process.env.VERCEL ? 10 : 20, processBatch, finalize });

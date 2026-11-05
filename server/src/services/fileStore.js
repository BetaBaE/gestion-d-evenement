import mongoose from 'mongoose';
import { Readable } from 'node:stream';

/**
 * Generated files (bulk badge PDFs, exports) in MongoDB GridFS: a PDF of
 * hundreds of badges exceeds the 16 MB document limit. Every file has an
 * expiry (metadata.expireLe) and is removed by cleanupExpiredFiles().
 */
function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'fichiers' });
}

export async function saveFile(buffer, { filename, contentType, expireLe, organisateurId, jobId }) {
  const upload = bucket().openUploadStream(filename, { metadata: { contentType, expireLe, organisateurId, jobId } });
  await new Promise((resolve, reject) => {
    Readable.from(buffer).pipe(upload).on('finish', resolve).on('error', reject);
  });
  return { fileId: upload.id, nom: filename, taille: buffer.length };
}

export async function readFile(fileId) {
  const chunks = [];
  for await (const chunk of bucket().openDownloadStream(new mongoose.Types.ObjectId(String(fileId)))) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function findFile(fileId) {
  return mongoose.connection.db.collection('fichiers.files').findOne({ _id: new mongoose.Types.ObjectId(String(fileId)) });
}

export function openFileStream(fileId) {
  return bucket().openDownloadStream(new mongoose.Types.ObjectId(String(fileId)));
}

export async function deleteFile(fileId) {
  try {
    await bucket().delete(new mongoose.Types.ObjectId(String(fileId)));
  } catch {
    // already gone
  }
}

export async function cleanupExpiredFiles(now = new Date()) {
  const expired = await mongoose.connection.db
    .collection('fichiers.files')
    .find({ 'metadata.expireLe': { $lt: now } })
    .project({ _id: 1 })
    .toArray();
  for (const f of expired) await deleteFile(f._id);
  return expired.length;
}

import { axiosClient } from './axiosClient.js';
import { getSelectedOrganisateurId } from '../admin/organisateurContext.js';

/**
 * The single place image URLs are built. Relative to the API base (same
 * origin as the app via the proxy), never a hard-coded host.
 * - `prive`: use the authenticated, tenant-scoped admin route (required
 *   for participant photos, which the public route refuses).
 * - `v`: cache-buster (image hash or updatedAt) so a replaced image isn't
 *   served from the browser cache.
 */
export function getImageUrl(imageId, { v, prive = false } = {}) {
  if (!imageId) return null;
  const base = axiosClient.defaults.baseURL;
  const path = prive
    ? `${base}/admin/organisateurs/${getSelectedOrganisateurId()}/images/${imageId}`
    : `${base}/images/${imageId}`;
  return v ? `${path}?v=${encodeURIComponent(v)}` : path;
}

async function uploadImage(path, file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: options.onUploadProgress,
  });
  return data;
}

export function uploadOrganisateurLogo(organisateurId, file, options) {
  return uploadImage(`/admin/organisateurs/${organisateurId}/logo`, file, options);
}

export async function deleteOrganisateurLogo(organisateurId) {
  const { data } = await axiosClient.delete(`/admin/organisateurs/${organisateurId}/logo`);
  return data;
}

export function uploadOrganismeLogo(organisateurId, eventId, organismeId, file, options) {
  return uploadImage(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/organismes/${organismeId}/logo`,
    file,
    options,
  );
}

export async function deleteOrganismeLogo(organisateurId, eventId, organismeId) {
  const { data } = await axiosClient.delete(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/organismes/${organismeId}/logo`,
  );
  return data;
}

export function badgePreviewUrl(organisateurId, eventId) {
  return `${axiosClient.defaults.baseURL}/admin/organisateurs/${organisateurId}/events/${eventId}/badge-apercu`;
}

export function uploadParticipantPhoto(organisateurId, eventId, participantId, file, options) {
  return uploadImage(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/participants/${participantId}/photo`,
    file,
    options,
  );
}

export async function deleteParticipantPhoto(organisateurId, eventId, participantId) {
  const { data } = await axiosClient.delete(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/participants/${participantId}/photo`,
  );
  return data;
}

export async function deleteAllParticipantPhotos(organisateurId, eventId) {
  const { data } = await axiosClient.delete(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/participants/photos`,
  );
  return data;
}

export function badgePreviewHtmlUrl(organisateurId, eventId) {
  return `${axiosClient.defaults.baseURL}/admin/organisateurs/${organisateurId}/events/${eventId}/badge-apercu-html`;
}

export async function createPartenaire(organisateurId, { nom, siteWeb, actif }, file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('nom', nom);
  if (siteWeb) formData.append('siteWeb', siteWeb);
  if (actif !== undefined) formData.append('actif', String(actif));
  const { data } = await axiosClient.post(`/admin/organisateurs/${organisateurId}/partenaires`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: options.onUploadProgress,
  });
  return data;
}

export async function updatePartenaire(organisateurId, partenaireId, { nom, siteWeb, actif }, file, options = {}) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (nom !== undefined) formData.append('nom', nom);
  if (siteWeb !== undefined) formData.append('siteWeb', siteWeb);
  if (actif !== undefined) formData.append('actif', String(actif));
  const { data } = await axiosClient.put(
    `/admin/organisateurs/${organisateurId}/partenaires/${partenaireId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: options.onUploadProgress },
  );
  return data;
}

export function uploadBadgeImage(organisateurId, eventId, file, options) {
  return uploadImage(`/admin/organisateurs/${organisateurId}/events/${eventId}/badge-image`, file, options);
}

export function uploadModeleImage(organisateurId, modeleId, file, options) {
  return uploadImage(`/admin/organisateurs/${organisateurId}/modeles-badge/${modeleId}/badge-image`, file, options);
}

export function modelePreviewUrl(organisateurId, modeleId) {
  return `${axiosClient.defaults.baseURL}/admin/organisateurs/${organisateurId}/modeles-badge/${modeleId}/apercu`;
}

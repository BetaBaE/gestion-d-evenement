import { axiosClient } from './axiosClient.js';
import { getSelectedOrganisateurId } from '../admin/organisateurContext.js';

export function adminImageUrl(imageId) {
  const organisateurId = getSelectedOrganisateurId();
  return `${axiosClient.defaults.baseURL}/admin/organisateurs/${organisateurId}/images/${imageId}`;
}

export function publicImageUrl(imageId) {
  return `${axiosClient.defaults.baseURL}/images/${imageId}`;
}

async function uploadImage(path, file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export function uploadOrganisateurLogo(organisateurId, file) {
  return uploadImage(`/admin/organisateurs/${organisateurId}/logo`, file);
}

export async function deleteOrganisateurLogo(organisateurId) {
  const { data } = await axiosClient.delete(`/admin/organisateurs/${organisateurId}/logo`);
  return data;
}

export function uploadOrganismeLogo(organisateurId, eventId, organismeId, file) {
  return uploadImage(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/organismes/${organismeId}/logo`,
    file,
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

export function uploadParticipantPhoto(organisateurId, eventId, participantId, file) {
  return uploadImage(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/participants/${participantId}/photo`,
    file,
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

export function uploadBadgeBanniere(organisateurId, eventId, file) {
  return uploadImage(`/admin/organisateurs/${organisateurId}/events/${eventId}/badge-banniere`, file);
}

export async function deleteBadgeBanniere(organisateurId, eventId) {
  const { data } = await axiosClient.delete(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/badge-banniere`,
  );
  return data;
}

export function uploadBadgeLogoEvenement(organisateurId, eventId, file) {
  return uploadImage(`/admin/organisateurs/${organisateurId}/events/${eventId}/badge-logo-evenement`, file);
}

export async function deleteBadgeLogoEvenement(organisateurId, eventId) {
  const { data } = await axiosClient.delete(
    `/admin/organisateurs/${organisateurId}/events/${eventId}/badge-logo-evenement`,
  );
  return data;
}

export function badgePreviewHtmlUrl(organisateurId, eventId) {
  return `${axiosClient.defaults.baseURL}/admin/organisateurs/${organisateurId}/events/${eventId}/badge-apercu-html`;
}

export async function createPartenaire(organisateurId, { nom, siteWeb, actif }, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('nom', nom);
  if (siteWeb) formData.append('siteWeb', siteWeb);
  if (actif !== undefined) formData.append('actif', String(actif));
  const { data } = await axiosClient.post(`/admin/organisateurs/${organisateurId}/partenaires`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updatePartenaire(organisateurId, partenaireId, { nom, siteWeb, actif }, file) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (nom !== undefined) formData.append('nom', nom);
  if (siteWeb !== undefined) formData.append('siteWeb', siteWeb);
  if (actif !== undefined) formData.append('actif', String(actif));
  const { data } = await axiosClient.put(
    `/admin/organisateurs/${organisateurId}/partenaires/${partenaireId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

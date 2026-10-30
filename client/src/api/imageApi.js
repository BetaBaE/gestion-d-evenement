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

export function uploadBadgeBackground(organisateurId, eventId, file) {
  return uploadImage(`/admin/organisateurs/${organisateurId}/events/${eventId}/badge-fond`, file);
}

export async function deleteBadgeBackground(organisateurId, eventId) {
  const { data } = await axiosClient.delete(`/admin/organisateurs/${organisateurId}/events/${eventId}/badge-fond`);
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

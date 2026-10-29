import { axiosClient } from './axiosClient.js';
import { getSelectedOrganisateurId } from '../admin/organisateurContext.js';

function statsBasePath(eventId) {
  const organisateurId = getSelectedOrganisateurId();
  return `/admin/organisateurs/${organisateurId}/events/${eventId}/stats`;
}

export async function getEventSummary(eventId) {
  const { data } = await axiosClient.get(`${statsBasePath(eventId)}/summary`);
  return data;
}

export async function getPresenceByCategorie(eventId) {
  const { data } = await axiosClient.get(`${statsBasePath(eventId)}/presence-categorie`);
  return data;
}

export async function getPresenceByOrganisme(eventId) {
  const { data } = await axiosClient.get(`${statsBasePath(eventId)}/presence-organisme`);
  return data;
}

export async function getArrivalCurve(eventId) {
  const { data } = await axiosClient.get(`${statsBasePath(eventId)}/arrivees`);
  return data;
}

export async function getNoShowParticipants(eventId) {
  const { data } = await axiosClient.get(`${statsBasePath(eventId)}/absents`);
  return data;
}

export async function getParticipantStats(eventId, participantId) {
  const { data } = await axiosClient.get(`${statsBasePath(eventId)}/participants/${participantId}`);
  return data;
}

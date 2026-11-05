import { axiosClient } from './axiosClient.js';
import { getSelectedOrganisateurId } from '../admin/organisateurContext.js';

const base = (eventId) => `/admin/organisateurs/${getSelectedOrganisateurId()}/events/${eventId}/actions-groupees`;

/** Counts per organisme / catégorie and the inscription groups (group shortcuts). */
export const getGroupCounts = (eventId) => axiosClient.get(`${base(eventId)}/compteurs`).then((r) => r.data);
/** Eligibility summary computed by the server for the confirmation dialog. */
export const previewBulkAction = (eventId, body) => axiosClient.post(`${base(eventId)}/apercu`, body).then((r) => r.data);
/** Starts the background job; returns { id, statut }. */
export const runBulkAction = (eventId, body) => axiosClient.post(base(eventId), body).then((r) => r.data);

import { axiosClient } from './axiosClient.js';
import { getSelectedOrganisateurId } from '../admin/organisateurContext.js';

const base = () => `/admin/organisateurs/${getSelectedOrganisateurId()}/taches`;

/** Client-generated id of one user action: the same id twice (double click) gives the same job. */
export function newRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// No organisateur selected yet (right after login): nothing to list.
const hasOrganisateur = () => !!getSelectedOrganisateurId();

export const listJobs = () => (hasOrganisateur() ? axiosClient.get(base()).then((r) => r.data.items) : Promise.resolve([]));
// Runs a worker step server-side, then lists: what moves jobs forward on serverless hosting.
export const advanceJobs = () => (hasOrganisateur() ? axiosClient.post(`${base()}/avancer`).then((r) => r.data.items) : Promise.resolve([]));
export const cancelJob = (id) => axiosClient.post(`${base()}/${id}/annuler`);
export const retryJobFailures = (id) => axiosClient.post(`${base()}/${id}/reessayer`, { requestId: newRequestId() }).then((r) => r.data);
export const jobFileUrl = (jobId, fileId) => `${axiosClient.defaults.baseURL}${base()}/${jobId}/fichiers/${fileId}`;

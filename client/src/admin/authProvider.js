import { axiosClient } from '../api/axiosClient.js';
import { setSelectedOrganisateurId } from './organisateurContext.js';

function syncOrganisateurContext(identity) {
  if (identity.role === 'GESTIONNAIRE') {
    setSelectedOrganisateurId(identity.organisateurId);
  }
}

export const authProvider = {
  async login({ username, password, turnstileToken }) {
    const { data } = await axiosClient.post('/auth/login', { email: username, password, turnstileToken });
    localStorage.setItem('identity', JSON.stringify(data));
    syncOrganisateurContext(data);
    return data;
  },

  async logout() {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Logging out should always succeed client-side, even if the
      // server call fails (e.g. the session already expired).
    }
    localStorage.removeItem('identity');
  },

  async checkAuth() {
    await axiosClient.get('/auth/me');
  },

  async checkError(error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      localStorage.removeItem('identity');
      throw error;
    }
  },

  async getIdentity() {
    const { data } = await axiosClient.get('/auth/me');
    localStorage.setItem('identity', JSON.stringify(data));
    syncOrganisateurContext(data);
    return {
      id: data.id,
      fullName: `${data.prenom} ${data.nom}`,
      ...data,
    };
  },

  async getPermissions() {
    const raw = localStorage.getItem('identity');
    return raw ? JSON.parse(raw).role : null;
  },
};

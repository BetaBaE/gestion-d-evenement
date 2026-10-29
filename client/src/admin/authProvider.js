import { axiosClient } from '../api/axiosClient.js';

export const authProvider = {
  async login({ email, password }) {
    const { data } = await axiosClient.post('/auth/login', { email, password });
    localStorage.setItem('identity', JSON.stringify(data));
    return data;
  },

  async logout() {
    await axiosClient.post('/auth/logout');
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

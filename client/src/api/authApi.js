import { axiosClient } from './axiosClient.js';

export async function loginRequest(email, password) {
  const { data } = await axiosClient.post('/auth/login', { email, password });
  return data;
}

export async function logoutRequest() {
  await axiosClient.post('/auth/logout');
}

export async function meRequest() {
  const { data } = await axiosClient.get('/auth/me');
  return data;
}

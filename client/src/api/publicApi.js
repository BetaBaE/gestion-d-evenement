import { axiosClient } from './axiosClient.js';

export async function getInscriptionForm(formToken) {
  const { data } = await axiosClient.get(`/public/inscription/${formToken}`);
  return data;
}

export async function submitInscription(formToken, payload) {
  const { data } = await axiosClient.post(`/public/inscription/${formToken}`, payload);
  return data;
}

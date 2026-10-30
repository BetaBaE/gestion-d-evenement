import { axiosClient } from './axiosClient.js';
import { getSelectedOrganisateurId } from '../admin/organisateurContext.js';

function basePath() {
  const organisateurId = getSelectedOrganisateurId();
  return `/admin/organisateurs/${organisateurId}/email-settings`;
}

export async function getEmailSettings() {
  const { data } = await axiosClient.get(basePath());
  return data;
}

export async function saveEmailSettings(payload) {
  const { data } = await axiosClient.put(basePath(), payload);
  return data;
}

export async function testEmailSettings(testRecipientEmail) {
  const { data } = await axiosClient.post(`${basePath()}/test`, { testRecipientEmail });
  return data;
}

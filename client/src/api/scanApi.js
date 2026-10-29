import { axiosClient } from './axiosClient.js';

export async function checkScanAccess(scanToken) {
  const { data } = await axiosClient.get(`/public/scan/${scanToken}`);
  return data;
}

export async function submitScan(scanToken, badgeCode) {
  const { data } = await axiosClient.post(`/public/scan/${scanToken}`, { badgeCode });
  return data;
}

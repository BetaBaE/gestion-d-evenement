import { getImageUrl } from './imageApi.js';
import { axiosClient } from './axiosClient.js';

export async function getInscriptionForm(formToken) {
  const { data } = await axiosClient.get(`/public/inscription/${formToken}`);
  return data;
}

export async function submitInscription(formToken, { data: jsonData, photos, turnstileToken }) {
  const formData = new FormData();
  formData.append('data', JSON.stringify(jsonData));
  photos.forEach((file, index) => {
    if (file) {
      formData.append(`photo_${index}`, file);
    }
  });

  const { data } = await axiosClient.post(`/public/inscription/${formToken}`, formData, {
    // The bot-check token travels in a header: the server checks it before reading the photos.
    headers: { 'Content-Type': 'multipart/form-data', ...(turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}) },
  });
  return data;
}

export function imageUrl(imageId) {
  return getImageUrl(imageId);
}

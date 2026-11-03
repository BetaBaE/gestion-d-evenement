import axios from 'axios';

export const axiosClient = axios.create({
  // Same-origin API by default (Vite proxy in dev, Vercel rewrite online).
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

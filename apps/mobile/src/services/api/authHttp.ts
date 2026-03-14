import axios from 'axios';
import appConfig from '@/config/appConfig';

const base = () => appConfig.api.baseUrl.replace(/\/+$/, '');

/** Axios instance for auth endpoints only (no interceptors; used before api client is ready). */
export const authAxios = axios.create({
  baseURL: base(),
  headers: { 'Content-Type': 'application/json', 'X-Client': 'mahfil' },
  validateStatus: () => true,
});

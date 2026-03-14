import axios from 'axios';
import appConfig from '@/config/appConfig';

const base = () => appConfig.api.baseUrl.replace(/\/+$/, '');

export const authAxios = axios.create({
  baseURL: base(),
  headers: { 'Content-Type': 'application/json', 'X-Client': 'mahfil' },
  validateStatus: () => true,
});

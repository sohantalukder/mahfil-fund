import axios from 'axios';
import { createApiClient } from '@mahfil/api-sdk';

const internalHttp = axios.create({ baseURL: '/' });

export function getApi() {
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
    getAccessToken: async () => {
      try {
        const { data } = await internalHttp.get<{ accessToken?: string }>('/api/auth/access-token');
        return data.accessToken ?? null;
      } catch {
        return null;
      }
    },
    onUnauthorizedRetry: async () => {
      try {
        await internalHttp.post('/api/auth/refresh');
        return true;
      } catch {
        return false;
      }
    },
    onAuthFailure: async () => {
      try {
        await internalHttp.post('/api/auth/logout');
      } catch {
        // ignore failure during logout
      }
    }
  });
}

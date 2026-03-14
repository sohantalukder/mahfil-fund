import axios from 'axios';
import { createApiClient } from '@mahfil/api-sdk';

const internalHttp = axios.create({ baseURL: '/' });

const COMMUNITY_STORAGE_KEY = 'mf_admin_community';

/** Persisted active community (same key as Providers). Required as X-Community-Id on API. */
export function getStoredCommunityId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COMMUNITY_STORAGE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { id?: string };
    return typeof c?.id === 'string' && c.id.length > 0 ? c.id : null;
  } catch {
    return null;
  }
}

export function getApi() {
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
    getCommunityId: () => getStoredCommunityId(),
    /** Every axios request sends X-Community-Id from localStorage; block tenant calls until a community is chosen. */
    enforceCommunityId: true,
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

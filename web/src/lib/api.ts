import { createApiClient } from './api-client';
import { clearAccessToken, getAccessToken, refreshSession } from './auth-session';

export const COMMUNITY_STORAGE_KEY = 'mahfil_active_community_web';

/** Persisted active community used to construct tenant route paths. */
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

const api = createApiClient({
    baseUrl: '/backend',
    getCommunityId: () => getStoredCommunityId(),
    enforceCommunityId: true,
    communityOptionalUrl: (path) =>
      path === '/me' ||
      path === '/communities' ||
      path === '/communities/mine' ||
      path === '/communities/creation-stats' ||
      path.startsWith('/platform/'),
    getAccessToken,
    onUnauthorizedRetry: refreshSession,
    onAuthFailure: clearAccessToken,
  });

export function getApi() {
  return api;
}

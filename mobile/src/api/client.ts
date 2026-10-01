import { createApiClient, type ApiClient } from '@/api/createApiClient';
import localStore from '@/services/storage/localStore.service';
import { getApiBaseUrl } from '@/config/env';
import { clearSession, getAccessToken, refreshSession } from '@/services/auth/session.service';

export type CommunityRef = { id: string; name: string; slug: string; role?: string };

function getCommunityId(): string | null {
  const raw = localStore.getActiveCommunityJson();
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as CommunityRef;
    return c.id ?? null;
  } catch {
    return null;
  }
}

let memberClient: ApiClient | null = null;
let adminClient: ApiClient | null = null;

/**
 * Portal / member API — community header when selected; never blocks on missing community.
 */
export function getApi(): ApiClient {
  if (!memberClient) {
    memberClient = createApiClient({
      baseUrl: getApiBaseUrl(),
      getAccessToken,
      getDeviceId: () => localStore.getInstallationId(),
      getCommunityId,
      enforceCommunityId: false,
      communityOptionalUrl: () => true,
      onUnauthorizedRetry: async () => Boolean(await refreshSession()),
      onAuthFailure: clearSession,
    });
  }
  return memberClient;
}

/**
 * Admin-style calls require an active community except for explicit platform paths.
 */
export function getAdminApi(): ApiClient {
  if (!adminClient) {
    adminClient = createApiClient({
      baseUrl: getApiBaseUrl(),
      getAccessToken,
      getDeviceId: () => localStore.getInstallationId(),
      getCommunityId,
      enforceCommunityId: true,
      communityOptionalUrl: (p) =>
        p === '/communities' ||
        p === '/communities/mine' ||
        p === '/communities/creation-stats' ||
        p.startsWith('/me') ||
        p.startsWith('/platform/'),
      onUnauthorizedRetry: async () => Boolean(await refreshSession()),
      onAuthFailure: clearSession,
    });
  }
  return adminClient;
}

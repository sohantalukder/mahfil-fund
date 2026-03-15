import { createApiClient, type ApiClient } from '@/api/createApiClient';
import DeviceInfo from 'react-native-device-info';
import localStore from '@/services/storage/localStore.service';
import { getApiBaseUrl } from '@/config/env';
import { supabase } from '@/lib/supabase';

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
      getAccessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
      getDeviceId: () => DeviceInfo.getUniqueIdSync(),
      getCommunityId,
      enforceCommunityId: false,
      communityOptionalUrl: () => true,
    });
  }
  return memberClient;
}

/**
 * Admin-style calls: require X-Community-Id except for explicit optional paths.
 */
export function getAdminApi(): ApiClient {
  if (!adminClient) {
    adminClient = createApiClient({
      baseUrl: getApiBaseUrl(),
      getAccessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
      getDeviceId: () => DeviceInfo.getUniqueIdSync(),
      getCommunityId,
      enforceCommunityId: true,
      communityOptionalUrl: (p) =>
        p === '/communities' ||
        p === '/communities/mine' ||
        p === '/communities/creation-stats' ||
        p.startsWith('/me'),
    });
  }
  return adminClient;
}

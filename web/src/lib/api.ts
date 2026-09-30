import { createApiClient } from './api-client';
import { createSupabaseBrowserClient } from './supabase/client';

export const COMMUNITY_STORAGE_KEY = 'mahfil_active_community_web';

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
  const supabase = createSupabaseBrowserClient();
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
    getCommunityId: () => getStoredCommunityId(),
    /** Every axios request sends X-Community-Id from localStorage; block tenant calls until a community is chosen. */
    enforceCommunityId: true,
    communityOptionalUrl: (path) =>
      path === '/me' ||
      path === '/communities' ||
      path === '/communities/mine' ||
      path === '/communities/creation-stats' ||
      path === '/invitations/verify',
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
    onAuthFailure: async () => {
      await supabase.auth.signOut();
    }
  });
}

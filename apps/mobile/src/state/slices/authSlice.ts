import type { StateCreator } from 'zustand';
import localStore from '@/services/storage/localStore.service';
import appConfig from '@/config/appConfig';
import { supabase } from '@/services/supabase/supabaseClient';
import { createApiClient } from '@mahfil/api-sdk';
import type { UserRole } from '@mahfil/types';

export interface IUser {
  id: string;
  authUserId: string;
  email?: string;
  roles: UserRole[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: IUser | null;
  isBootstrapped: boolean;
  isOfflineMode: boolean;
  lastTokenRefreshAt?: string;
  // Actions
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  // Actions
  logout: () => void;
  setUser: (user: AuthState['user']) => void;
}

export const createAuthSlice: StateCreator<AuthState> = (set) => ({
  isAuthenticated: false,
  user: null,
  isBootstrapped: false,
  isOfflineMode: false,
  bootstrap: async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    if (token) localStore.setApiToken(token);

    // If we have a session, we allow entering app even if currently offline.
    // Role/profile will be refreshed when the API is reachable.
    if (data.session?.user) {
      set({ isAuthenticated: true, isOfflineMode: false });
      try {
        const api = createApiClient({
          baseUrl: appConfig.api.baseUrl,
          getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
        });
        const me = await api.get<{ user: { id: string; authUserId: string; roles: UserRole[] } }>('/me');
        if (me.success) {
          const email = data.session.user.email ?? undefined;
          set({
            user: {
              id: me.data.user.id,
              authUserId: me.data.user.authUserId,
              roles: me.data.user.roles,
              ...(email ? { email } : {}),
            },
            isAuthenticated: true,
            isOfflineMode: false,
          });
        } else {
          // API unreachable or forbidden; fall back to offline mode if we still have a session.
          set({ isOfflineMode: true });
        }
      } catch {
        set({ isOfflineMode: true });
      }
    } else {
      set({ isAuthenticated: false, user: null, isOfflineMode: false });
    }
    set({ isBootstrapped: true });
  },
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.access_token) localStore.setApiToken(data.session.access_token);
    set({ isAuthenticated: true, isOfflineMode: false });
  },
  logout: () => {
    localStore.clearApiToken();
    supabase.auth.signOut().catch(() => undefined);
    set({
      isAuthenticated: false,
      user: null,
      isOfflineMode: false,
    });
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
});

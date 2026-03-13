import type { StateCreator } from 'zustand';
import localStore from '@/services/storage/localStore.service';
import appConfig from '@/config/appConfig';
import type { UserRole } from '@mahfil/types';
import { api } from '@/services/api/apiClient';

export interface IUser {
  id: string;
  email?: string;
  fullName?: string;
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
    const token = localStore.getApiToken();
    if (!token) {
      set({ isAuthenticated: false, user: null, isOfflineMode: false });
      set({ isBootstrapped: true });
      return;
    }

    try {
      const me = await api.get<{
        user: {
          id: string;
          email?: string;
          fullName?: string;
          roles: UserRole[];
          memberships?: Array<{ community: { id: string; name: string; slug: string }; role: string }>;
        };
      }>('/me');
      if (me.success) {
        set({
          user: {
            id: me.data.user.id,
            roles: me.data.user.roles,
            ...(me.data.user.email ? { email: me.data.user.email } : {}),
            ...(me.data.user.fullName ? { fullName: me.data.user.fullName } : {})
          },
          isAuthenticated: true,
          isOfflineMode: false
        });
        // Hydrate community list from memberships
        const memberships = me.data.user.memberships ?? [];
        const mapped = memberships.map((m) => ({ ...m.community, role: m.role }));
        // Import store to update community slice - use dynamic to avoid circular
        // The community slice reads activeCommunity from localStore on init already
        // so we just need to update the communities list
        const { useStore } = await import('@/state/store');
        useStore.getState().setCommunities(mapped);
      } else {
        localStore.clearAuthTokens();
        set({ isAuthenticated: false, user: null, isOfflineMode: false });
      }
    } catch {
      // Keep user in app when offline as long as tokens still exist.
      set({ isAuthenticated: true, isOfflineMode: true });
    }
    set({ isBootstrapped: true });
  },
  login: async (email, password) => {
    const response = await fetch(`${appConfig.api.baseUrl.replace(/\/+$/, '')}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client': 'mahfil' },
      body: JSON.stringify({ email, password })
    });
    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message?: string };
      data?: {
        accessToken?: string;
        refreshToken?: string;
        user?: { id: string; email?: string; fullName?: string; roles: UserRole[] };
      };
    };
    if (!response.ok || !payload.success || !payload.data?.accessToken || !payload.data.refreshToken) {
      throw new Error(payload.error?.message ?? 'Login failed');
    }

    localStore.setApiToken(payload.data.accessToken);
    localStore.setRefreshToken(payload.data.refreshToken);
    set({
      isAuthenticated: true,
      isOfflineMode: false,
      user: payload.data.user
        ? {
            id: payload.data.user.id,
            roles: payload.data.user.roles,
            ...(payload.data.user.email ? { email: payload.data.user.email } : {}),
            ...(payload.data.user.fullName ? { fullName: payload.data.user.fullName } : {})
          }
        : null
    });
  },
  logout: () => {
    const refreshToken = localStore.getRefreshToken();
    const accessToken = localStore.getApiToken();
    if (refreshToken) {
      fetch(`${appConfig.api.baseUrl.replace(/\/+$/, '')}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client': 'mahfil',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ refreshToken })
      }).catch(() => undefined);
    }
    localStore.clearAuthTokens();
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

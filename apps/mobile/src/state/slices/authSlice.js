import localStore from '@/services/storage/localStore.service';
import appConfig from '@/config/appConfig';
import { api } from '@/services/api/apiClient';
export const createAuthSlice = (set) => ({
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
            const me = await api.get('/me');
            if (me.success) {
                set({
                    user: {
                        id: me.data.user.id,
                        email: me.data.user.email,
                        fullName: me.data.user.fullName,
                        roles: me.data.user.roles
                    },
                    isAuthenticated: true,
                    isOfflineMode: false
                });
            }
            else {
                localStore.clearAuthTokens();
                set({ isAuthenticated: false, user: null, isOfflineMode: false });
            }
        }
        catch {
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
        const payload = await response.json();
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
                    email: payload.data.user.email,
                    fullName: payload.data.user.fullName,
                    roles: payload.data.user.roles
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

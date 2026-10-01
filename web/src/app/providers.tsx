'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';
import { ensureI18n } from '@/lib/i18n';
import { COMMUNITY_STORAGE_KEY, getApi } from '@/lib/api';
import { getAccessToken, refreshSession, subscribeAuthFailure } from '@/lib/auth-session';
import { ToastProvider } from '@/components/portal/toast';
import { ErrorBoundary } from '@/components/portal/ErrorBoundary';

type ThemeMode = 'light' | 'dark';
type LanguageMode = 'bn' | 'en';

const THEME_KEY = 'mf_web_theme';
const LANGUAGE_KEY = 'mf_web_language';
const LEGACY_COMMUNITY_KEYS = ['mf_admin_community'];

export type CommunityInfo = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  fullName?: string | null;
  createdAt?: string;
  isSuperAdmin: boolean;
  communities: CommunityInfo[];
};

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
};

type LanguageContextValue = {
  language: LanguageMode;
  setLanguage: (mode: LanguageMode) => void;
};

type CommunityContextValue = {
  activeCommunity: CommunityInfo | null;
  communities: CommunityInfo[];
  setActiveCommunity: (community: CommunityInfo | null) => void;
  setCommunities: (communities: CommunityInfo[]) => void;
};

type CurrentUserContextValue = {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const CommunityContext = createContext<CommunityContextValue | undefined>(undefined);
const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within Providers');
  return context;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within Providers');
  return context;
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error('useCommunity must be used within Providers');
  return context;
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error('useCurrentUser must be used within Providers');
  return context;
}

function readStoredCommunity(): CommunityInfo | null {
  if (typeof window === 'undefined') return null;
  for (const key of [COMMUNITY_STORAGE_KEY, ...LEGACY_COMMUNITY_KEYS]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const community = JSON.parse(raw) as CommunityInfo;
      if (typeof community?.id === 'string' && community.id.length > 0) return community;
    } catch {
      // Try the next legacy key.
    }
  }
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const i18n = ensureI18n();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [language, setLanguageState] = useState<LanguageMode>('bn');
  const [activeCommunity, setActiveCommunityState] = useState<CommunityInfo | null>(readStoredCommunity);
  const [communities, setCommunitiesState] = useState<CommunityInfo[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY) ?? window.localStorage.getItem('mf_admin_theme');
    const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY) ?? window.localStorage.getItem('mf_admin_language');
    if (savedTheme === 'light' || savedTheme === 'dark') setThemeState(savedTheme);
    if (savedLanguage === 'bn' || savedLanguage === 'en') setLanguageState(savedLanguage);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    window.localStorage.setItem(THEME_KEY, mode);
  }, []);

  const setLanguage = useCallback((mode: LanguageMode) => {
    setLanguageState(mode);
    window.localStorage.setItem(LANGUAGE_KEY, mode);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [i18n, language]);

  const setCommunities = useCallback((next: CommunityInfo[]) => {
    setCommunitiesState(next);
  }, []);

  const setActiveCommunity = useCallback(
    (community: CommunityInfo | null) => {
      const previousId = activeCommunity?.id;
      setActiveCommunityState(community);
      if (community) window.localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(community));
      else window.localStorage.removeItem(COMMUNITY_STORAGE_KEY);

      if (previousId && previousId !== community?.id) {
        void queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== 'auth-profile',
        });
      }
    },
    [activeCommunity?.id, queryClient],
  );

  const refreshCurrentUser = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (!getAccessToken() && !(await refreshSession())) {
        setUser(null);
        setCommunitiesState([]);
        return;
      }

      const api = getApi();
      const response = await api.get<{ user?: Omit<CurrentUser, 'communities'> & {
        memberships?: Array<{ community: Omit<CommunityInfo, 'role'>; role: string }>;
      } }>('/me');
      if (!response.success || !response.data?.user) {
        throw new Error(response.success ? 'User profile was not returned.' : response.error.message);
      }

      const profile = response.data.user;
      const nextCommunities = (profile.memberships ?? []).map((membership) => ({
        ...membership.community,
        role: membership.role,
      }));

      const normalizedUser: CurrentUser = { ...profile, communities: nextCommunities };
      setUser(normalizedUser);
      setCommunitiesState(nextCommunities);

      const stored = readStoredCommunity();
      setActiveCommunityState((previous) => {
        const selected =
          (stored ? nextCommunities.find((community) => community.id === stored.id) : undefined) ??
          (previous
            ? nextCommunities.find((community) => community.id === previous.id)
            : undefined) ??
          nextCommunities[0] ??
          null;
        if (selected) window.localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(selected));
        else window.localStorage.removeItem(COMMUNITY_STORAGE_KEY);
        return selected;
      });
    } catch (error) {
      setUser(null);
      setCommunitiesState([]);
      setAuthError(error instanceof Error ? error.message : 'Unable to load the signed-in user.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  useEffect(() => subscribeAuthFailure(() => {
    setUser(null);
    setCommunitiesState([]);
    setActiveCommunityState(null);
    window.localStorage.removeItem(COMMUNITY_STORAGE_KEY);
    queryClient.clear();
  }), [queryClient]);

  const themeValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  const languageValue = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  const communityValue = useMemo(
    () => ({ activeCommunity, communities, setActiveCommunity, setCommunities }),
    [activeCommunity, communities, setActiveCommunity, setCommunities],
  );
  const currentUserValue = useMemo(
    () => ({ user, loading: authLoading, error: authError, refresh: refreshCurrentUser }),
    [user, authLoading, authError, refreshCurrentUser],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <LanguageContext.Provider value={languageValue}>
          <ThemeContext.Provider value={themeValue}>
            <CommunityContext.Provider value={communityValue}>
              <CurrentUserContext.Provider value={currentUserValue}>
                <div data-theme={theme}>
                  <ToastProvider>
                    <ErrorBoundary>{children}</ErrorBoundary>
                  </ToastProvider>
                </div>
              </CurrentUserContext.Provider>
            </CommunityContext.Provider>
          </ThemeContext.Provider>
        </LanguageContext.Provider>
      </I18nextProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

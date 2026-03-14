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
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';
import { ensureI18n } from '@/lib/i18n';
import { ToastProvider } from './components/toast';
import { ErrorBoundary } from './components/ErrorBoundary';

type ThemeMode = 'light' | 'dark';
type LanguageMode = 'bn' | 'en';

const THEME_KEY = 'mf_admin_theme';
const LANGUAGE_KEY = 'mf_admin_language';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
};

type LanguageContextValue = {
  language: LanguageMode;
  setLanguage: (mode: LanguageMode) => void;
};

type CommunityInfo = { id: string; name: string; slug: string; role: string };

type CommunityContextValue = {
  activeCommunity: CommunityInfo | null;
  communities: CommunityInfo[];
  setActiveCommunity: (c: CommunityInfo) => void;
  setCommunities: (c: CommunityInfo[]) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const CommunityContext = createContext<CommunityContextValue | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within Providers');
  return ctx;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within Providers');
  return ctx;
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within Providers');
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const i18n = ensureI18n();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [language, setLanguageState] = useState<LanguageMode>('bn');
  const [activeCommunity, setActiveCommunityState] = useState<CommunityInfo | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('mf_admin_community');
      if (!raw) return null;
      const c = JSON.parse(raw) as CommunityInfo;
      return typeof c?.id === 'string' && c.id.length > 0 ? c : null;
    } catch {
      return null;
    }
  });
  const [communities, setCommunities] = useState<CommunityInfo[]>([]);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Hydrate from localStorage once on client. Do NOT write theme/language to storage here —
  // separate persist effects used to run on the same tick and overwrite saved values with defaults.
  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    const savedCommunity = window.localStorage.getItem('mf_admin_community');
    if (savedTheme === 'light' || savedTheme === 'dark') setThemeState(savedTheme);
    if (savedLanguage === 'bn' || savedLanguage === 'en') setLanguageState(savedLanguage);
    if (savedCommunity) {
      try {
        setActiveCommunityState(JSON.parse(savedCommunity) as CommunityInfo);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    try {
      window.localStorage.setItem(THEME_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const setLanguage = useCallback((mode: LanguageMode) => {
    setLanguageState(mode);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [i18n, language]);

  const setActiveCommunity = (c: CommunityInfo) => {
    const prev = activeCommunity;
    setActiveCommunityState(c);
    window.localStorage.setItem('mf_admin_community', JSON.stringify(c));
    if (prev && prev.id !== c.id) {
      void queryClient.removeQueries({ queryKey: ['donors'] });
      void queryClient.removeQueries({ queryKey: ['donations'] });
      void queryClient.removeQueries({ queryKey: ['expenses'] });
      void queryClient.removeQueries({ queryKey: ['events'] });
      void queryClient.removeQueries({ queryKey: ['users'] });
      void queryClient.removeQueries({ queryKey: ['audit-logs'] });
      void queryClient.removeQueries({ queryKey: ['error-logs'] });
      void queryClient.removeQueries({ queryKey: ['reports'] });
    }
  };

  const value: ThemeContextValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  const languageValue: LanguageContextValue = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );
  const communityValue: CommunityContextValue = useMemo(
    () => ({ activeCommunity, communities, setActiveCommunity, setCommunities }),
    [activeCommunity, communities],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <LanguageContext.Provider value={languageValue}>
          <ThemeContext.Provider value={value}>
            <CommunityContext.Provider value={communityValue}>
              <div data-theme={theme}>
                <ToastProvider>
                  <ErrorBoundary>{children}</ErrorBoundary>
                </ToastProvider>
              </div>
            </CommunityContext.Provider>
          </ThemeContext.Provider>
        </LanguageContext.Provider>
      </I18nextProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

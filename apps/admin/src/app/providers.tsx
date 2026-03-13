'use client';

import {
  type ReactNode,
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

type ThemeMode = 'light' | 'dark';
type LanguageMode = 'bn' | 'en';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
};

type LanguageContextValue = {
  language: LanguageMode;
  setLanguage: (mode: LanguageMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

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

export function Providers({ children }: { children: ReactNode }) {
  const i18n = ensureI18n();
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [language, setLanguage] = useState<LanguageMode>('bn');
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

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('mf_admin_theme');
    const savedLanguage = window.localStorage.getItem('mf_admin_language');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
    if (savedLanguage === 'bn' || savedLanguage === 'en') {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('mf_admin_theme', theme);
  }, [theme]);

  useEffect(() => {
    void i18n.changeLanguage(language);
    window.localStorage.setItem('mf_admin_language', language);
  }, [i18n, language]);

  const value: ThemeContextValue = useMemo(
    () => ({ theme, setTheme }),
    [theme],
  );

  const languageValue: LanguageContextValue = useMemo(
    () => ({ language, setLanguage }),
    [language],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <LanguageContext.Provider value={languageValue}>
          <ThemeContext.Provider value={value}>
            <div data-theme={theme}>
              <ToastProvider>
                {children}
              </ToastProvider>
            </div>
          </ThemeContext.Provider>
        </LanguageContext.Provider>
      </I18nextProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

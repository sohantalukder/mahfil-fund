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

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within Providers');
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const i18n = ensureI18n();
  const [theme, setTheme] = useState<ThemeMode>('light');
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
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value: ThemeContextValue = useMemo(
    () => ({ theme, setTheme }),
    [theme],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeContext.Provider value={value}>
          <div data-theme={theme}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </div>
        </ThemeContext.Provider>
      </I18nextProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

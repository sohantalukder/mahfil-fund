'use client';

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { I18nextProvider } from 'react-i18next';
import { ensureI18n } from '@/lib/i18n';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within Providers');
  }
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  const i18n = ensureI18n();
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value: ThemeContextValue = useMemo(
    () => ({ theme, setTheme }),
    [theme],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeContext.Provider value={value}>
        <div data-theme={theme}>
          <ConditionalHeader />
          {children}
        </div>
      </ThemeContext.Provider>
    </I18nextProvider>
  );
}

function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname === '/dashboard') return null;
  return <Header />;
}

function Header() {
  const { theme, setTheme } = useTheme();
  const i18n = ensureI18n();
  const pathname = usePathname();
  const router = useRouter();

  const lang = i18n.language === 'bn' ? 'bn' : 'en';

  const t = {
    en: {
      appName: 'Mahfil Fund',
      appRole: 'Donors & expenses',
      back: 'Back',
      themeLight: 'Light',
      themeDark: 'Dark',
      language: 'বাংলা',
    },
    bn: {
      appName: 'মাহফিল ফান্ড',
      appRole: 'দাতা ও খরচ',
      back: 'পেছনে',
      themeLight: 'লাইট',
      themeDark: 'ডার্ক',
      language: 'English',
    },
  }[lang];

  const isRoot = pathname === '/';

  function toggleTheme() {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  function toggleLanguage() {
    i18n.changeLanguage(lang === 'bn' ? 'en' : 'bn');
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        {!isRoot && (
          <button
            type="button"
            className="back-button"
            onClick={() => router.back()}
          >
            ← {t.back}
          </button>
        )}
        <Link href="/" className="app-header-title">
          <span className="app-header-title-main">{t.appName}</span>
          <span className="app-header-title-sub">{t.appRole}</span>
        </Link>
      </div>

      <div className="app-header-right">
        <button type="button" className="chip" onClick={toggleTheme}>
          {theme === 'light' ? t.themeLight : t.themeDark}
        </button>
        <button type="button" className="chip" onClick={toggleLanguage}>
          {t.language}
        </button>
      </div>
    </header>
  );
}


'use client';

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  if (pathname === '/') return null;
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
      appRole: 'Admin control panel',
      dashboard: 'Dashboard',
      donors: 'Donors',
      expenses: 'Expenses',
      reports: 'Reports',
      settings: 'Settings',
      profile: 'Profile',
      back: 'Back',
      themeLight: 'Light',
      themeDark: 'Dark',
      language: 'বাংলা',
    },
    bn: {
      appName: 'মাহফিল ফান্ড',
      appRole: 'অ্যাডমিন কন্ট্রোল প্যানেল',
      dashboard: 'ড্যাশবোর্ড',
      donors: 'দাতা',
      expenses: 'খরচ',
      reports: 'রিপোর্ট',
      settings: 'সেটিংস',
      profile: 'প্রোফাইল',
      back: 'পেছনে',
      themeLight: 'লাইট',
      themeDark: 'ডার্ক',
      language: 'English',
    },
  }[lang];

  const isRoot = pathname === '/' || pathname === '/admin';
  const mainLinks = [
    { href: '/', label: t.dashboard },
    { href: '/donors', label: t.donors },
    { href: '/expenses', label: t.expenses },
    { href: '/reports', label: t.reports },
    { href: '/settings', label: t.settings },
  ];

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

      <nav className="app-header-nav" aria-label="Primary">
        {mainLinks.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'app-header-link' +
                (active ? ' app-header-link-active' : '')
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="app-header-right">
        <button type="button" className="chip" onClick={toggleTheme}>
          {theme === 'light' ? t.themeLight : t.themeDark}
        </button>
        <button type="button" className="chip" onClick={toggleLanguage}>
          {t.language}
        </button>
        <Link href="/profile" className="profile-pill" aria-label={t.profile}>
          N
        </Link>
      </div>
    </header>
  );
}


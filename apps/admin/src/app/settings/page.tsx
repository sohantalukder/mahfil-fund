'use client';

import { useTheme } from '../providers';
import { ensureI18n } from '@/lib/i18n';

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const i18n = ensureI18n();
  const lang = i18n.language === 'bn' ? 'bn' : 'en';

  const t = {
    en: {
      title: 'Settings',
      subtitle: 'Control theme and language for the admin UI.',
      themeLabel: 'Theme',
      light: 'Light',
      dark: 'Dark',
      languageLabel: 'Interface language',
      english: 'English',
      bangla: 'বাংলা',
      saveHint: 'Changes apply immediately on toggle.',
    },
    bn: {
      title: 'সেটিংস',
      subtitle: 'অ্যাডমিন UI-এর থিম ও ভাষা নিয়ন্ত্রণ করুন।',
      themeLabel: 'থিম',
      light: 'লাইট',
      dark: 'ডার্ক',
      languageLabel: 'ইন্টারফেস ভাষা',
      english: 'English',
      bangla: 'বাংলা',
      saveHint: 'টগল করলেই পরিবর্তন সঙ্গে সঙ্গে কার্যকর হয়।',
    },
  }[lang];

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </div>

      <section className="card form">
        <div className="section-header">
          <div>
            <div className="section-title">{t.themeLabel}</div>
            <div className="section-subtitle">{t.saveHint}</div>
          </div>
        </div>
        <div className="field" role="radiogroup" aria-label={t.themeLabel}>
          <button
            type="button"
            className={'chip' + (theme === 'light' ? ' chip-strong' : '')}
            onClick={() => setTheme('light')}
          >
            {t.light}
          </button>
          <button
            type="button"
            className={'chip' + (theme === 'dark' ? ' chip-strong' : '')}
            onClick={() => setTheme('dark')}
          >
            {t.dark}
          </button>
        </div>

        <div className="section-header" style={{ marginTop: 12 }}>
          <div>
            <div className="section-title">{t.languageLabel}</div>
          </div>
        </div>
        <div className="field" role="radiogroup" aria-label={t.languageLabel}>
          <button
            type="button"
            className={
              'chip' + (i18n.language === 'en' ? ' chip-strong' : '')
            }
            onClick={() => i18n.changeLanguage('en')}
          >
            {t.english}
          </button>
          <button
            type="button"
            className={
              'chip' + (i18n.language === 'bn' ? ' chip-strong' : '')
            }
            onClick={() => i18n.changeLanguage('bn')}
          >
            {t.bangla}
          </button>
        </div>
      </section>
    </main>
  );
}


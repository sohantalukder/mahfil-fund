'use client';

import { useTheme } from '../providers';
import { ensureI18n } from '@/lib/i18n';

export default function ProfilePage() {
  const { theme } = useTheme();
  const i18n = ensureI18n();
  const lang = i18n.language === 'bn' ? 'bn' : 'en';

  const t = {
    en: {
      title: 'Profile',
      subtitle: 'View your admin profile and preferences.',
      name: 'Name',
      role: 'Role',
      language: 'Interface language',
      theme: 'Theme',
    },
    bn: {
      title: 'প্রোফাইল',
      subtitle: 'আপনার অ্যাডমিন প্রোফাইল ও পছন্দসমূহ দেখুন।',
      name: 'নাম',
      role: 'ভূমিকা',
      language: 'ইন্টারফেস ভাষা',
      theme: 'থিম',
    },
  }[lang];

  const languageLabel = lang === 'bn' ? 'বাংলা' : 'English';
  const themeLabel = theme === 'light' ? 'Light' : 'Dark';

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </div>

      <section className="card" style={{ maxWidth: 480, display: 'grid', gap: 10 }}>
        <div className="section-header">
          <div>
            <div className="section-title">{t.title}</div>
            <div className="section-subtitle">{t.subtitle}</div>
          </div>
        </div>

        <div className="field">
          <div className="field-label">{t.name}</div>
          <p className="muted">Admin User</p>
        </div>

        <div className="field">
          <div className="field-label">{t.role}</div>
          <p className="muted">Mahfil organizer</p>
        </div>

        <div className="field">
          <div className="field-label">{t.language}</div>
          <p className="muted">{languageLabel}</p>
        </div>

        <div className="field">
          <div className="field-label">{t.theme}</div>
          <p className="muted">{themeLabel}</p>
        </div>
      </section>
    </main>
  );
}


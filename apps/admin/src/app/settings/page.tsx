'use client';

import { useState } from 'react';
import { useLanguage, useTheme } from '../providers';
import { PageShell } from '../components/shell';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import styles from './settings.module.css';

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  return (
    <PageShell title={t('settings.settings')} subtitle={t('settings.manageAppearance')}>
      <div className={styles.container}>
        {/* Theme */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('settings.appearance')}</div>
          <div className={styles.field}>
            <label className={styles.label}>{t('settings.theme')}</label>
            <div className={styles.btnGroup}>
              <Button
                type="button"
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                disabled={saving}
                onClick={() => {
                  setSaving(true);
                  setTheme('light');
                  setTimeout(() => setSaving(false), 300);
                }}
              >
                ☀ {t('settings.light')}
              </Button>
              <Button
                type="button"
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                disabled={saving}
                onClick={() => {
                  setSaving(true);
                  setTheme('dark');
                  setTimeout(() => setSaving(false), 300);
                }}
              >
                ● {t('settings.dark')}
              </Button>
            </div>
            <p className={styles.hint}>
              {saving ? t('settings.applyingTheme') : t('settings.changesApplyImmediately')}
            </p>
          </div>
        </div>

        {/* Language */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('settings.language')}</div>
          <div className={styles.field}>
            <label className={styles.label}>{t('settings.displayLanguage')}</label>
            <div className={styles.btnGroup}>
              <Button
                type="button"
                variant={language === 'bn' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('bn')}
              >
                {t('settings.bangla')}
              </Button>
              <Button
                type="button"
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
              >
                {t('settings.english')}
              </Button>
            </div>
            <p className={styles.hint}>
              {t('app.name')} — {t('dashboard.dashboard')}
            </p>
          </div>
        </div>

        {/* About */}
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{t('settings.about')}</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('settings.application')}</span>
              <span className={styles.infoValue}>{t('settings.mahfilFundAdmin')}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('settings.version')}</span>
              <span className={styles.infoValue}>1.0.0</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{t('settings.environment')}</span>
              <span className={styles.infoValue}>{process.env.NODE_ENV}</span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

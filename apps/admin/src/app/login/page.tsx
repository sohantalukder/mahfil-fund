'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './login.module.css';

function LoginForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.replace(params.get('next') ?? '/');
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>🕌</div>
          <div>
            <div className={styles.brandName}>{t('app.name')}</div>
            <div className={styles.brandRole}>{t('admin.nav.adminControlPanel')}</div>
          </div>
        </div>

        <div className={styles.title}>{t('admin.login.welcomeBack')}</div>
        <div className={styles.subtitle}>{t('admin.login.signInToContinue')}</div>

        <form onSubmit={(e) => void onSubmit(e)}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">{t('admin.login.emailAddress')}</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder={t('admin.login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? t('admin.login.signingIn') : t('admin.login.signIn')}
          </button>
          {error && <div className={styles.errorMsg}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

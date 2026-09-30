'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getApi } from '@/lib/api';
import { canAccessAdminPortal, safeNextPath } from '@/lib/navigation';
import type { CurrentUser } from '../providers';
import styles from './login.module.css';

type LoginMode = 'password' | 'magic-link';

async function defaultDestination(): Promise<string> {
  try {
    const response = await getApi().get<{ user?: CurrentUser }>('/me');
    if (response.success && response.data?.user && canAccessAdminPortal(response.data.user)) {
      return '/admin';
    }
  } catch {
    // Fall back to the customer portal when profile resolution fails.
  }
  return '/';
}

function LoginForm() {
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const requestedNext = safeNextPath(params.get('next'));

  useEffect(() => {
    const callbackError = params.get('error');
    if (callbackError) setError(callbackError);

    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      router.replace(requestedNext ?? (await defaultDestination()));
    });
  }, [params, requestedNext, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === 'password') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      router.replace(requestedNext ?? (await defaultDestination()));
      router.refresh();
      return;
    }

    const callback = new URL('/auth/callback', window.location.origin);
    if (requestedNext) callback.searchParams.set('next', requestedNext);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.toString() },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setMessage('Check your email for a secure sign-in link.');
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>🕌</div>
          <div>
            <div className={styles.brandName}>Mahfil Fund</div>
            <div className={styles.brandRole}>Customer and Admin Portal</div>
          </div>
        </div>

        <div className={styles.title}>Welcome back</div>
        <div className={styles.subtitle}>Sign in with your password or request a magic link.</div>

        <div className={styles.modeSwitch} role="tablist" aria-label="Sign-in method">
          <button
            type="button"
            className={mode === 'password' ? styles.modeActive : styles.modeButton}
            onClick={() => setMode('password')}
          >
            Password
          </button>
          <button
            type="button"
            className={mode === 'magic-link' ? styles.modeActive : styles.modeButton}
            onClick={() => setMode('magic-link')}
          >
            Magic link
          </button>
        </div>

        <form onSubmit={(event) => void onSubmit(event)}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email address</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {mode === 'password' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          )}

          <button className={styles.submitBtn} type="submit" disabled={loading || !email}>
            {loading
              ? 'Please wait…'
              : mode === 'password'
                ? 'Sign in'
                : 'Send magic link'}
          </button>
          {message && <div className={styles.successMsg}>{message}</div>}
          {error && <div className={styles.errorMsg}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

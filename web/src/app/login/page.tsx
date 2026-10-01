'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { completeFirstLogin, login, refreshSession } from '@/lib/auth-session';
import { getApi } from '@/lib/api';
import { canAccessAdminPortal, safeNextPath } from '@/lib/navigation';
import type { CurrentUser } from '../providers';
import styles from './login.module.css';

async function defaultDestination(): Promise<string> {
  try {
    const response = await getApi().get<{ user?: CurrentUser }>('/me');
    if (response.success && response.data?.user && canAccessAdminPortal(response.data.user)) return '/admin';
  } catch { /* use customer portal */ }
  return '/';
}

function errorMessage(error: unknown) {
  const responseMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
  return responseMessage ?? (error instanceof Error ? error.message : 'Unable to sign in.');
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const requestedNext = safeNextPath(params.get('next'));

  useEffect(() => {
    void refreshSession().then(async (active) => {
      if (active) router.replace(requestedNext ?? (await defaultDestination()));
    });
  }, [requestedNext, router]);

  async function finishLogin() {
    router.replace(requestedNext ?? (await defaultDestination()));
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (challengeToken) {
        if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');
        await completeFirstLogin(challengeToken, newPassword);
        await finishLogin();
        return;
      }
      const result = await login(email, password);
      if (result.requiresPasswordChange) {
        setChallengeToken(result.challengeToken);
        setPassword('');
        return;
      }
      await finishLogin();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}><div className={styles.brandIcon}>🕌</div><div>
          <div className={styles.brandName}>Mahfil Fund</div>
          <div className={styles.brandRole}>Customer and Admin Portal</div>
        </div></div>
        <div className={styles.title}>{challengeToken ? 'Set your password' : 'Welcome back'}</div>
        <div className={styles.subtitle}>{challengeToken
          ? 'Your temporary password must be replaced before you continue.'
          : 'Sign in with the password issued by your administrator.'}</div>
        <form onSubmit={(event) => void onSubmit(event)}>
          {!challengeToken ? <>
            <div className={styles.field}><label className={styles.label} htmlFor="email">Email address</label>
              <input id="email" className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </div>
            <div className={styles.field}><label className={styles.label} htmlFor="password">Password</label>
              <input id="password" className={styles.input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
            </div>
            <Link href="/forgot-password">Forgot password?</Link>
          </> : <>
            <div className={styles.field}><label className={styles.label} htmlFor="new-password">New password</label>
              <input id="new-password" className={styles.input} type="password" minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required autoComplete="new-password" />
            </div>
            <div className={styles.field}><label className={styles.label} htmlFor="confirm-password">Confirm password</label>
              <input id="confirm-password" className={styles.input} type="password" minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" />
            </div>
          </>}
          <button className={styles.submitBtn} type="submit" disabled={loading}>{loading ? 'Please wait…' : challengeToken ? 'Set password and continue' : 'Sign in'}</button>
          {error && <div className={styles.errorMsg}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }

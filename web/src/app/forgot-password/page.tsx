'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, resetPassword } from '@/lib/auth-session';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!codeRequested) {
        await requestPasswordReset(email.trim());
        setCodeRequested(true);
      } else {
        if (password.length < 10) throw new Error('Password must be at least 10 characters.');
        if (password !== confirm) throw new Error('Passwords do not match.');
        await resetPassword(email.trim(), code.trim(), password);
        setComplete(true);
      }
    } catch (caught) {
      const responseMessage = (caught as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(responseMessage ?? (caught instanceof Error ? caught.message : 'Unable to reset password.'));
    } finally {
      setLoading(false);
    }
  }

  return <div className={styles.page}><div className={styles.card}>
    <div className={styles.title}>{complete ? 'Password reset' : 'Reset your password'}</div>
    <div className={styles.subtitle}>{complete
      ? 'Your previous sessions have been revoked. Sign in with your new password.'
      : codeRequested
        ? 'Enter the six-digit recovery code and choose a new password.'
        : 'Enter your email. The response is the same whether or not an account exists.'}</div>
    {complete ? <Link href="/login">Return to sign in</Link> : <form onSubmit={(event) => void submit(event)}>
      <div className={styles.field}><label className={styles.label} htmlFor="email">Email address</label>
        <input id="email" className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={codeRequested} autoComplete="email" />
      </div>
      {codeRequested && <>
        <div className={styles.field}><label className={styles.label} htmlFor="code">Recovery code</label>
          <input id="code" className={styles.input} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required autoComplete="one-time-code" />
        </div>
        <div className={styles.field}><label className={styles.label} htmlFor="new-password">New password</label>
          <input id="new-password" className={styles.input} type="password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" />
        </div>
        <div className={styles.field}><label className={styles.label} htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" className={styles.input} type="password" minLength={10} value={confirm} onChange={(event) => setConfirm(event.target.value)} required autoComplete="new-password" />
        </div>
      </>}
      <button className={styles.submitBtn} type="submit" disabled={loading}>{loading ? 'Please wait…' : codeRequested ? 'Reset password' : 'Send recovery code'}</button>
      {error && <div className={styles.errorMsg}>{error}</div>}
      <Link href="/login">Back to sign in</Link>
    </form>}
  </div></div>;
}

'use client';

import { Suspense, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginInner() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage('Check your email for a magic link to sign in.');
    const next = params.get('next') || '/';
    setTimeout(() => router.replace(next), 3000);
  }

  return (
    <div className="db-login-page">
      <div className="db-login-card">
        <div className="db-login-brand">
          <div className="db-login-icon">🕌</div>
          <div>
            <div className="db-login-brand-name">Mahfil Fund</div>
            <div className="db-login-brand-role">User Portal</div>
          </div>
        </div>

        <div className="db-login-title">Sign in</div>
        <div className="db-login-subtitle">
          We&apos;ll send you a one-time magic link to access your account.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="db-login-field">
            <label className="db-login-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              className="db-login-input"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="db-login-btn"
            disabled={loading || !email}
          >
            {loading ? 'Sending link…' : 'Send Magic Link'}
          </button>
        </form>

        {message && <div className="db-login-success">{message}</div>}
        {error && <div className="db-login-error">{error}</div>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Sign in failed');
      return;
    }
    router.replace(params.get('next') || '/');
  }

  return (
    <div className="db-login-page">
      <div className="db-login-card">
        <div className="db-login-brand">
          <div className="db-login-icon">🕌</div>
          <div>
            <div className="db-login-brand-name">Iftar Manager</div>
            <div className="db-login-brand-role">Admin Control Panel</div>
          </div>
        </div>

        <div className="db-login-title">Welcome back</div>
        <div className="db-login-subtitle">Sign in to continue to the admin portal.</div>

        <form onSubmit={onSubmit}>
          <div className="db-login-field">
            <label className="db-login-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="db-login-input"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="db-login-field">
            <label className="db-login-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="db-login-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button className="db-login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          {error && <div className="db-login-error">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

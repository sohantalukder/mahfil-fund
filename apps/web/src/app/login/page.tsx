'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const next = params.get('next') || '/';
    router.replace(next);
  }

  return (
    <main style={{ maxWidth: 420, margin: '48px auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Mahfil Fund</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>Login to continue</p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error && <div style={{ color: '#b91c1c' }}>{error}</div>}
        <button disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </main>
  );
}


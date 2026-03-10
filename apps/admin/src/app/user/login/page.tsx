'use client';

import { Suspense, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

function UserLoginInner() {
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
      typeof window !== 'undefined'
        ? `${window.location.origin}/user`
        : undefined;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage('Check your email for a magic link to continue.');

    const next = params.get('next');
    if (next) {
      router.replace(next);
    } else {
      router.replace('/user');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-black px-4 py-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-xl">
            🕌
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold tracking-tight text-slate-50">
              Mahfil Fund
            </p>
            <p className="text-xs text-slate-400">User Panel</p>
          </div>
        </div>

        <Card className="space-y-4 border-slate-800/70 bg-slate-950/90 p-4 shadow-lg shadow-black/40">
          <div className="space-y-1">
            <h1 className="text-sm font-semibold tracking-tight text-slate-50">
              Sign in with email
            </h1>
            <p className="text-[11px] text-slate-400">
              We&apos;ll send you a one-time link to access your panel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-[11px] font-medium text-slate-200"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 border-slate-700/80 bg-slate-900/80 text-sm text-slate-50 placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              size="md"
              className="mt-1 w-full rounded-full text-xs"
              disabled={loading || !email}
            >
              {loading ? 'Sending link…' : 'Send magic link'}
            </Button>
          </form>

          {message && (
            <p className="rounded-md border border-emerald-500/40 bg-emerald-950/40 p-2.5 text-[11px] text-emerald-200">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-950/40 p-2.5 text-[11px] text-red-200">
              {error}
            </p>
          )}
        </Card>

        <p className="text-center text-[11px] text-slate-500">
          Admins can continue to use the email + password login at{' '}
          <span className="font-medium text-slate-300">/login</span>.
        </p>
      </div>
    </div>
  );
}

export default function UserLoginPage() {
  return (
    <Suspense>
      <UserLoginInner />
    </Suspense>
  );
}


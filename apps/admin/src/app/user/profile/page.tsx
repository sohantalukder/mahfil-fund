'use client';

import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { UserGuard } from '../_components/user-guard';

type Profile = {
  name: string;
  email: string;
  initials: string;
  createdAt: string;
};

export default function UserProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        setLoading(false);
        return;
      }
      const name: string =
        (user.user_metadata as any)?.full_name ||
        user.email?.split('@')[0] ||
        'Friend';
      const initials = name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      setProfile({
        name,
        email: user.email || '',
        initials,
        createdAt: user.created_at || '',
      });
      setFullName(name);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    setSaving(false);
    if (error) {
      // Keep UX minimal; you can expand to toast later
      // eslint-disable-next-line no-alert
      alert(error.message);
      return;
    }
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            name: fullName,
            initials: fullName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2),
          }
        : prev,
    );
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/user/login';
  }

  return (
    <UserGuard>
      <div className="space-y-5">
        <section className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight text-slate-50">
            Profile
          </h1>
          <p className="text-[11px] text-slate-400">
            Basic information about your account.
          </p>
        </section>

        <Card className="space-y-4 border-slate-700/60 bg-slate-950/70 p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-200">
                  {profile?.initials}
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-slate-50">
                    {profile?.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {profile?.email}
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-[11px] text-slate-400">
                <p>
                  Member since{' '}
                  <span className="font-medium text-slate-200">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : '—'}
                  </span>
                </p>
              </div>
            </>
          )}
        </Card>

        <Card className="space-y-3 border-slate-700/60 bg-slate-950/70 p-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-100">
              Display name
            </p>
            <p className="text-[11px] text-slate-400">
              This name is used in greetings only.
            </p>
          </div>
          <input
            className="h-9 w-full rounded-md border border-slate-700/70 bg-slate-900/70 px-3 text-sm text-slate-50 outline-none ring-emerald-500 focus:ring-1"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="rounded-full px-4 text-xs"
              disabled={saving || !fullName}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 border-red-500/40 bg-red-950/50 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-red-100">Sign out</p>
            <p className="text-[11px] text-red-200/80">
              You can sign in again later with the same email.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full rounded-full text-xs"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </Card>
      </div>
    </UserGuard>
  );
}


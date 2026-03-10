'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { UserGuard } from './_components/user-guard';

type UserSummary = {
  totalDonated: number;
  lastDonationAmount: number | null;
  lastDonationAt: string | null;
  donationsCount: number;
};

type Donation = {
  id: string;
  amount: number;
  eventName?: string;
  donationDate: string;
  status?: string;
};

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', {
    maximumFractionDigits: 0,
  }).format(n)}`;

export default function UserHomePage() {
  const [displayName, setDisplayName] = useState<string>('Friend');

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const fullName: string =
        (user.user_metadata as any)?.full_name ||
        user.email?.split('@')[0] ||
        'Friend';
      setDisplayName(fullName);
    });
  }, []);

  const {
    data: summary,
    isLoading: summaryLoading,
  } = useApiQuery<UserSummary>(
    ['user-summary'],
    async (client) => {
      const api = getApi(client);
      const res = await api.get<any>('/reports/user-summary');
      if (!res.success) {
        throw new Error(res.error.message);
      }
      const raw = res.data as any;
      return {
        totalDonated: raw.totalDonated ?? 0,
        lastDonationAmount: raw.lastDonationAmount ?? null,
        lastDonationAt: raw.lastDonationAt ?? null,
        donationsCount: raw.donationsCount ?? 0,
      };
    },
    {
      staleTime: 1000 * 60,
    },
  );

  const {
    data: recent,
    isLoading: donationsLoading,
  } = useApiQuery<Donation[]>(
    ['user-donations-latest'],
    async (client) => {
      const api = getApi(client);
      const res = await api.get<any>('/donations?scope=me&limit=5');
      if (!res.success) {
        throw new Error(res.error.message);
      }
      const d = res.data as any;
      const list = (d.donations ?? d ?? []) as any[];
      return list.map((item) => ({
        id: item.id,
        amount: item.amount,
        eventName: item.eventName ?? item.eventSnapshotName,
        donationDate: item.donationDate,
        status: item.status,
      }));
    },
    {
      staleTime: 1000 * 30,
    },
  );

  const loading = summaryLoading && donationsLoading;

  return (
    <UserGuard>
      <div className="space-y-5">
        <section className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-400">
            Assalamu Alaikum
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50">
            {displayName}
          </h1>
          <p className="text-xs leading-relaxed text-slate-400">
            A small sadaqah can feed someone&apos;s iftar today. Track and manage your
            contributions in one calm place.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Card className="border-emerald-500/20 bg-emerald-950/40 p-3 shadow-none">
            {summaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ) : (
              <>
                <div className="text-[11px] font-medium text-emerald-300/80">
                  Total given
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-50">
                  {fmtBDT(summary?.totalDonated ?? 0)}
                </div>
                <div className="mt-1 text-[10px] text-emerald-200/80">
                  May Allah accept your charity.
                </div>
              </>
            )}
          </Card>

          <Card className="border-slate-600/40 bg-slate-900/60 p-3 shadow-none">
            {summaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-14" />
              </div>
            ) : (
              <>
                <div className="text-[11px] font-medium text-slate-300/90">
                  Last donation
                </div>
                <div className="mt-1 text-base font-semibold text-slate-50">
                  {summary?.lastDonationAmount
                    ? fmtBDT(summary.lastDonationAmount)
                    : '—'}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  {summary?.lastDonationAt
                    ? new Date(summary.lastDonationAt).toLocaleDateString()
                    : 'No donations yet'}
                </div>
              </>
            )}
          </Card>
        </section>

        <section className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              Quick action
            </p>
            <p className="text-xs text-slate-300">
              Start a new donation or review your history.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-full px-4 text-xs">
            <Link href="/user/donations">New donation</Link>
          </Button>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-200">
              Recent donations
            </p>
            <Link
              href="/user/donations"
              className="text-[11px] font-medium text-emerald-300 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="space-y-2">
            {donationsLoading && !recent && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            )}
            {!donationsLoading && (!recent || recent.length === 0) && (
              <p className="rounded-md border border-dashed border-slate-700/80 bg-slate-900/40 p-3 text-[11px] text-slate-400">
                Your future donations will appear here. Start with a small amount for
                today&apos;s iftar.
              </p>
            )}
            {recent &&
              recent.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-50">
                      {fmtBDT(d.amount)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {d.eventName || 'Iftar Mahfil'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-slate-400">
                      {new Date(d.donationDate).toLocaleDateString()}
                    </span>
                    {d.status && (
                      <span className="mt-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                        {d.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </UserGuard>
  );
}


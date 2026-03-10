'use client';

import Link from 'next/link';

import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { UserGuard } from '../_components/user-guard';

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

export default function UserDonationsPage() {
  const {
    data,
    isLoading,
    error,
  } = useApiQuery<Donation[]>(
    ['user-donations-all'],
    async (client) => {
      const api = getApi(client);
      const res = await api.get<any>('/donations?scope=me');
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
      staleTime: 1000 * 60,
    },
  );

  const donations = data ?? [];

  return (
    <UserGuard>
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight text-slate-50">
            My donations
          </h1>
          <p className="text-[11px] text-slate-400">
            A simple history of the support you&apos;ve given.
          </p>
        </header>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Try to keep a small, consistent amount throughout Ramadan.
          </p>
          <Button asChild size="sm" className="rounded-full px-3 text-xs">
            <Link href="/user">Home</Link>
          </Button>
        </div>

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-950/40 p-3 text-[11px] text-red-200">
            {error.message}
          </p>
        )}

        <div className="space-y-2">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          )}

          {!isLoading && donations.length === 0 && !error && (
            <p className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/50 p-4 text-[11px] text-slate-400">
              You haven&apos;t made a donation yet. Start with a small amount —
              the intention matters more than the number.
            </p>
          )}

          {donations.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-900/70 px-3.5 py-2.5"
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
      </div>
    </UserGuard>
  );
}


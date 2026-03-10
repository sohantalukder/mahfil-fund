'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

const ROLE_COLOR: Record<string, string> = {
  super_admin: '#7c3aed',
  admin: '#2563eb',
  collector: '#059669',
  viewer: '#6b7280',
};

const ROLE_PERMS: Record<string, { read: boolean; write: boolean; del: boolean; admin: boolean }> = {
  viewer:      { read: true,  write: false, del: false, admin: false },
  collector:   { read: true,  write: true,  del: false, admin: false },
  admin:       { read: true,  write: true,  del: true,  admin: false },
  super_admin: { read: true,  write: true,  del: true,  admin: true  },
};

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

export default function DashboardPage() {
  const [displayName, setDisplayName] = useState<string>('');
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const fullName: string =
        (user.user_metadata as any)?.full_name || user.email?.split('@')[0] || 'Friend';
      setDisplayName(fullName);
    });

    const api = getApi();
    api.get<any>('/me').then((res) => {
      if (res.success) setRoles((res.data as any)?.user?.roles ?? []);
    });
  }, []);

  const { data: summary, isLoading: summaryLoading } = useApiQuery<UserSummary>(
    ['user-summary'],
    async () => {
      const api = getApi();
      const res = await api.get<any>('/reports/user-summary');
      if (!res.success) throw new Error(res.error.message);
      const raw = res.data as any;
      return {
        totalDonated: raw.totalDonated ?? 0,
        lastDonationAmount: raw.lastDonationAmount ?? null,
        lastDonationAt: raw.lastDonationAt ?? null,
        donationsCount: raw.donationsCount ?? 0,
      };
    },
    { staleTime: 1000 * 60 },
  );

  const { data: recent, isLoading: donationsLoading } = useApiQuery<Donation[]>(
    ['user-donations-latest'],
    async () => {
      const api = getApi();
      const res = await api.get<any>('/donations?scope=me&limit=5');
      if (!res.success) throw new Error(res.error.message);
      const d = res.data as any;
      return ((d.donations ?? d ?? []) as any[]).map((item) => ({
        id: item.id,
        amount: item.amount,
        eventName: item.eventName ?? item.eventSnapshotName,
        donationDate: item.donationDate,
        status: item.status,
      }));
    },
    { staleTime: 1000 * 30 },
  );

  const topRole = roles[0];

  const STAT_CARDS = [
    {
      label: 'Total Donated',
      value: summaryLoading ? '—' : fmtBDT(summary?.totalDonated ?? 0),
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="3" width="12" height="10" rx="2" />
          <path d="M5 7h6M5 10h4" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
      ),
      badge: 'Lifetime',
      badgeClass: 'db-stat-badge-green',
    },
    {
      label: 'Donations Made',
      value: summaryLoading ? '—' : String(summary?.donationsCount ?? 0),
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" />
          <path d="M5.5 8l2 2 3-3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      ),
      badge: 'Total',
      badgeClass: 'db-stat-badge-blue',
    },
    {
      label: 'Last Donation',
      value: summaryLoading
        ? '—'
        : summary?.lastDonationAmount
        ? fmtBDT(summary.lastDonationAmount)
        : '—',
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <line x1="5" y1="1.5" x2="5" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="11" y1="1.5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ),
      badge: summary?.lastDonationAt
        ? new Date(summary.lastDonationAt).toLocaleDateString()
        : 'None yet',
      badgeClass: '',
    },
    {
      label: 'Your Role',
      value: topRole ? fmt(topRole) : 'Member',
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="5" r="3" />
          <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
        </svg>
      ),
      badge: roles.length > 1 ? `+${roles.length - 1} more` : 'Access level',
      badgeClass: '',
      color: topRole ? ROLE_COLOR[topRole] : undefined,
    },
  ];

  return (
    <div className="animate-page">
      <div className="db-page-header">
        <div>
          <div className="db-page-title">
            Assalamu Alaikum{displayName ? `, ${displayName}` : ''}
          </div>
          <div className="db-page-subtitle">
            Track your sadaqah and contributions in one place.
          </div>
        </div>
        <div className="db-header-actions">
          <Link href="/donations" className="db-btn db-btn-primary">
            + New Donation
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="db-stat-grid animate-card">
        {STAT_CARDS.map((card) => (
          <div className="db-stat-card" key={card.label}>
            <div className="db-stat-top">
              <div
                className="db-stat-icon"
                style={card.color ? { background: card.color + '22', color: card.color } : {}}
              >
                {card.icon}
              </div>
              {card.badge && (
                <span
                  className={`db-stat-badge ${card.badgeClass}`}
                  style={
                    card.color
                      ? { background: card.color + '22', color: card.color }
                      : !card.badgeClass
                      ? { background: '#1e3226', color: '#5a7d62' }
                      : {}
                  }
                >
                  {card.badge}
                </span>
              )}
            </div>
            <div className="db-stat-title">{card.label}</div>
            <div className="db-stat-value" style={card.color ? { color: card.color } : {}}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent donations */}
      <div className="db-table-card animate-card">
        <div className="db-table-header">
          <span className="db-table-title">Recent Donations</span>
          <Link href="/donations" className="db-view-all">
            View all →
          </Link>
        </div>

        {donationsLoading ? (
          <div className="db-empty">Loading donations…</div>
        ) : !recent || recent.length === 0 ? (
          <div className="db-empty">
            No donations yet. Start with a small amount — the intention matters more than the number.
          </div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id}>
                  <td style={{ color: '#e8f0e9', fontWeight: 600 }}>{fmtBDT(d.amount)}</td>
                  <td>{d.eventName || 'Iftar Mahfil'}</td>
                  <td>{new Date(d.donationDate).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={
                        d.status === 'pending' ? 'db-status-pending' : 'db-status-confirmed'
                      }
                    >
                      {d.status || 'confirmed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Roles & permissions */}
      {roles.length > 0 && (
        <div className="db-table-card animate-card">
          <div className="db-table-header">
            <span className="db-table-title">Your Roles & Permissions</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {roles.map((role) => (
                <span
                  key={role}
                  className="db-stat-badge"
                  style={{
                    background: (ROLE_COLOR[role] || '#6b7280') + '22',
                    color: ROLE_COLOR[role] || '#6b7280',
                  }}
                >
                  {fmt(role)}
                </span>
              ))}
            </div>
          </div>
          <table className="db-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Read</th>
                <th>Write / Create</th>
                <th>Delete</th>
                <th>User Admin</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const p = ROLE_PERMS[role] ?? { read: true, write: false, del: false, admin: false };
                const tick = <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>;
                const dash = <span style={{ color: '#5a7d62' }}>—</span>;
                return (
                  <tr key={role}>
                    <td>
                      <span
                        className="db-stat-badge"
                        style={{
                          background: (ROLE_COLOR[role] || '#6b7280') + '22',
                          color: ROLE_COLOR[role] || '#6b7280',
                        }}
                      >
                        {fmt(role)}
                      </span>
                    </td>
                    <td>{p.read ? tick : dash}</td>
                    <td>{p.write ? tick : dash}</td>
                    <td>{p.del ? tick : dash}</td>
                    <td>{p.admin ? tick : dash}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

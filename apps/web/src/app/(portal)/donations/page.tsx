'use client';

import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/query';

type Donation = {
  id: string;
  amount: number;
  eventName?: string;
  donationDate: string;
  status?: string;
};

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

export default function DonationsPage() {
  const { data, isLoading, error } = useApiQuery<Donation[]>(
    ['user-donations-all'],
    async () => {
      const api = getApi();
      const res = await api.get<{ donations?: unknown[]; [key: string]: unknown }>('/donations?scope=me');
      if (!res.success) throw new Error(res.error.message);
      const d = res.data as { donations?: unknown[] } | unknown[];
      return ((Array.isArray(d) ? d : ((d as { donations?: unknown[] }).donations ?? [])) as Record<string, unknown>[]).map((item) => ({
        id: item.id,
        amount: item.amount,
        eventName: item.eventName ?? item.eventSnapshotName,
        donationDate: item.donationDate,
        status: item.status,
      }));
    },
    { staleTime: 1000 * 60 },
  );

  const donations = data ?? [];
  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="animate-page">
      <div className="db-page-header">
        <div>
          <div className="db-page-title">My Donations</div>
          <div className="db-page-subtitle">
            A complete history of your contributions. May Allah accept every one.
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div
        className="db-stat-grid animate-card"
        style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}
      >
        <div className="db-stat-card">
          <div className="db-stat-top">
            <div className="db-stat-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="3" width="12" height="10" rx="2" />
                <path d="M5 7h6M5 10h4" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className="db-stat-badge db-stat-badge-green">Lifetime</span>
          </div>
          <div className="db-stat-title">Total Donated</div>
          <div className="db-stat-value">{isLoading ? '—' : fmtBDT(totalDonated)}</div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-top">
            <div className="db-stat-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="6" />
                <path d="M5.5 8l2 2 3-3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <span className="db-stat-badge db-stat-badge-blue">Total</span>
          </div>
          <div className="db-stat-title">Donations Count</div>
          <div className="db-stat-value">{isLoading ? '—' : donations.length}</div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-top">
            <div className="db-stat-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2l1.5 4h4.5l-3.7 2.7 1.4 4.3L8 10.4l-3.7 2.6 1.4-4.3L2 6h4.5L8 2z" />
              </svg>
            </div>
          </div>
          <div className="db-stat-title">Average Donation</div>
          <div className="db-stat-value">
            {isLoading || donations.length === 0
              ? '—'
              : fmtBDT(Math.round(totalDonated / donations.length))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="db-table-card animate-card">
        <div className="db-table-header">
          <span className="db-table-title">Donation History</span>
          <span className="db-stat-badge db-stat-badge-blue">
            {donations.length} record{donations.length !== 1 ? 's' : ''}
          </span>
        </div>

        {error && (
          <div className="db-error" style={{ margin: '16px 20px 0' }}>
            {error.message}
          </div>
        )}

        {isLoading ? (
          <div className="db-empty">Loading your donations…</div>
        ) : donations.length === 0 && !error ? (
          <div className="db-empty">
            You haven&apos;t made a donation yet. Start with a small amount — the intention matters
            more than the number.
          </div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Amount</th>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d, i) => (
                <tr key={d.id}>
                  <td style={{ color: '#5a7d62', fontSize: 12 }}>{i + 1}</td>
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
    </div>
  );
}

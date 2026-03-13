'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/lib/api';
import Link from 'next/link';
import { useCommunity } from '../../providers';

interface Event {
  id: string;
  name: string;
  year: number;
}

const REPORT_TYPES = [
  { value: 'donation_summary', label: 'Donation Summary', description: 'Total donations by method and status' },
  { value: 'expense_summary', label: 'Expense Summary', description: 'All expenses categorized' },
  { value: 'donor_totals', label: 'Donor Totals', description: 'Per-donor contribution summary' },
  { value: 'balance_summary', label: 'Balance Summary', description: 'Collections minus expenses' },
  { value: 'payment_method_summary', label: 'Payment Methods', description: 'Breakdown by payment method' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'xlsx', label: 'Excel', icon: '📊' },
  { value: 'csv', label: 'CSV', icon: '📋' },
];

export default function ReportsPage() {
  const { activeCommunity } = useCommunity();
  const [reportType, setReportType] = useState('donation_summary');
  const [format, setFormat] = useState('pdf');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: events } = useQuery<Event[]>({
    queryKey: ['events-list', activeCommunity?.id],
    queryFn: async () => {
      if (!activeCommunity?.id) return [];
      const api = getApi();
      const res = await api.get<{ events?: Event[] }>('/events', {
        headers: { 'X-Community-Id': activeCommunity.id }
      });
      if (!res.success) return [];
      return (res.data as { events?: Event[] }).events ?? [];
    },
    enabled: !!activeCommunity?.id
  });

  async function handleDownload() {
    if (!activeCommunity?.id) return;
    setError('');
    setLoading(true);
    try {
      const params = new URLSearchParams({ reportType, format });
      if (eventId) params.set('eventId', eventId);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/export?${params}`, {
        headers: {
          'X-Community-Id': activeCommunity.id,
          Authorization: `Bearer ${await getAccessToken()}`
        }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!activeCommunity) {
    return (
      <div className="animate-page">
        <div className="db-page-header">
          <div><div className="db-page-title">Reports</div></div>
        </div>
        <div className="db-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: '#5a7d62', fontSize: 14 }}>Please select a community to generate reports.</div>
          <Link href="/communities" className="db-btn db-btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
            Go to My Communities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-page">
      <div className="db-page-header">
        <div>
          <div className="db-page-title">Reports</div>
          <div className="db-page-subtitle">{activeCommunity.name} — Export data as PDF, Excel, or CSV</div>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div className="db-table-card" style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: '#3d1111', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Report type */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Report Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REPORT_TYPES.map((rt) => (
                <label
                  key={rt.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 8, border: `1px solid ${reportType === rt.value ? '#22c55e' : '#1b2e1f'}`,
                    cursor: 'pointer', background: reportType === rt.value ? '#0d2b0f' : 'transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <input type="radio" value={rt.value} checked={reportType === rt.value} onChange={(e) => setReportType(e.target.value)} style={{ accentColor: '#22c55e' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0e9' }}>{rt.label}</div>
                    <div style={{ fontSize: 11, color: '#5a7d62' }}>{rt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Event filter */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Filter by Event (optional)</label>
            <select className="db-input" style={{ width: '100%' }} value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">All events</option>
              {events?.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.year})</option>
              ))}
            </select>
          </div>

          {/* Format */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: '#9CA3AF', display: 'block', marginBottom: 8 }}>Export Format</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${format === f.value ? '#22c55e' : '#1b2e1f'}`,
                    background: format === f.value ? '#0d2b0f' : 'transparent',
                    color: format === f.value ? '#22c55e' : '#9ca3af', transition: 'all 0.15s'
                  }}
                >
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="db-btn db-btn-primary"
            style={{ width: '100%' }}
            onClick={() => void handleDownload()}
            disabled={loading}
          >
            {loading ? 'Generating...' : `↓ Download ${FORMATS.find(f => f.value === format)?.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

async function getAccessToken(): Promise<string> {
  const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

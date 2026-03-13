'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getApi } from '@/lib/api';
import { useCommunity } from '../../providers';

interface Event {
  id: string;
  name: string;
  year: number;
  description?: string;
  startDate?: string;
  endDate?: string;
  targetAmount?: number;
  status: string;
  _count?: { donations: number; expenses: number };
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: '#14532d', color: '#22c55e' },
  UPCOMING:  { bg: '#1e3a5f', color: '#60a5fa' },
  COMPLETED: { bg: '#1c1c1c', color: '#9ca3af' },
  CANCELLED: { bg: '#3d1111', color: '#f87171' },
};

const fmtBDT = (n: number) =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

export default function EventsPage() {
  const { activeCommunity } = useCommunity();

  const { data, isLoading } = useQuery<{ events: Event[]; total: number }>({
    queryKey: ['events', activeCommunity?.id],
    queryFn: async () => {
      if (!activeCommunity?.id) return { events: [], total: 0 };
      const api = getApi();
      const res = await api.get<{ events: Event[]; total: number }>('/events', {
        headers: { 'X-Community-Id': activeCommunity.id }
      });
      if (!res.success) throw new Error((res as { error?: { message?: string } }).error?.message);
      return res.data as { events: Event[]; total: number };
    },
    enabled: !!activeCommunity?.id
  });

  if (!activeCommunity) {
    return (
      <div className="animate-page">
        <div className="db-page-header">
          <div><div className="db-page-title">Events</div></div>
        </div>
        <div className="db-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: '#5a7d62', fontSize: 14 }}>
            Please select a community from the sidebar to view events.
          </div>
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
          <div className="db-page-title">Events</div>
          <div className="db-page-subtitle">{activeCommunity.name}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="db-table-card" style={{ padding: '40px', textAlign: 'center', color: '#5a7d62' }}>
          Loading events...
        </div>
      ) : !data?.events?.length ? (
        <div className="db-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ color: '#5a7d62' }}>No events found for this community yet.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {data.events.map((event) => {
            const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.COMPLETED;
            return (
              <div key={event.id} className="db-table-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#e8f0e9', marginBottom: 2 }}>{event.name}</div>
                    <div style={{ fontSize: 12, color: '#5a7d62' }}>{event.year}</div>
                  </div>
                  <span style={{ background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8 }}>
                    {event.status}
                  </span>
                </div>

                {event.description && (
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12, lineHeight: 1.5 }}>
                    {event.description.length > 100 ? event.description.slice(0, 100) + '...' : event.description}
                  </div>
                )}

                {event.targetAmount && (
                  <div style={{ marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#5a7d62' }}>Target: </span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{fmtBDT(event.targetAmount)}</span>
                  </div>
                )}

                {(event.startDate || event.endDate) && (
                  <div style={{ fontSize: 12, color: '#5a7d62', marginBottom: 8 }}>
                    {event.startDate && `From ${new Date(event.startDate).toLocaleDateString()}`}
                    {event.startDate && event.endDate && ' — '}
                    {event.endDate && new Date(event.endDate).toLocaleDateString()}
                  </div>
                )}

                {event._count && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #1b2e1f' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{event._count.donations}</div>
                      <div style={{ fontSize: 10, color: '#5a7d62' }}>Donations</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171' }}>{event._count.expenses}</div>
                      <div style={{ fontSize: 10, color: '#5a7d62' }}>Expenses</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type Event = { id: string; name: string; year: number; isActive: boolean };

export default function EventsPage() {
  const api = useMemo(() => getApi(), []);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res: ApiResponse<{ events: Event[] }> = await api.get('/events');
    if (!res.success) setError(res.error.message);
    else setEvents(res.data.events);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: '24px auto', padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Events</h1>
      {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {events.map((e) => (
          <div key={e.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>
              {e.name} ({e.year}) {e.isActive ? '• Active' : ''}
            </div>
          </div>
        ))}
      </div>
      <p style={{ color: '#6b7280', marginTop: 16 }}>
        Event creation/activation UI will be expanded (role-gated to admin).
      </p>
    </main>
  );
}


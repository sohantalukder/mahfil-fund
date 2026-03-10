'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type Donation = { id: string; amount: number; paymentMethod: string; donationDate: string; donorSnapshotName: string };

export default function DonationsPage() {
  const api = useMemo(() => getApi(), []);
  const [eventId, setEventId] = useState('');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!eventId) return;
    setError(null);
    const res: ApiResponse<{ donations: Donation[] }> = await api.get(`/donations?eventId=${encodeURIComponent(eventId)}`);
    if (!res.success) setError(res.error.message);
    else setDonations(res.data.donations);
  }

  useEffect(() => {
    // no auto-load
  }, []);

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Donations</h1>
          <p>Light-mode list of donations for a single event.</p>
        </div>
        <div className="page-actions">
          <a className="btn btn-primary" href="/donations/new">
            Add donation
          </a>
        </div>
      </div>

      <div className="toolbar">
        <input
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Event ID (UUID)"
        />
        <button className="btn" type="button" onClick={load}>
          Load
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: '#fef2f2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Donations</div>
            <div className="section-subtitle">Incoming funds for this event.</div>
          </div>
          <div className="badge">{donations.length} results</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Donor</th>
              <th>Payment method</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Amount (BDT)</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id}>
                <td>{d.donorSnapshotName}</td>
                <td>{d.paymentMethod}</td>
                <td>{new Date(d.donationDate).toLocaleDateString()}</td>
                <td style={{ textAlign: 'right' }}>{d.amount.toLocaleString('en-BD')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}


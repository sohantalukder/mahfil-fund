'use client';

import { useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import type { ApiResponse } from '@mahfil/types';

type Donation = { id: string };

export default function AddDonationPage() {
  const api = useMemo(() => getApi(), []);
  const [eventId, setEventId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [donorName, setDonorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        eventId,
        amount: Number(amount),
        paymentMethod,
        donorSnapshotName: donorName || 'Anonymous'
      };
      const res: ApiResponse<{ donation: Donation }> = await api.post('/donations', payload);
      if (!res.success) {
        setError(res.error.message);
      } else {
        setSuccess('Donation added successfully.');
        setAmount('');
        setDonorName('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Add donation</h1>
          <p>Light-mode form to add a new donation to the active event.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
        <label style={{ fontSize: 13 }}>
          Event ID
          <input
            style={{ marginTop: 4 }}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Event ID (UUID)"
            required
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Donor name
          <input
            style={{ marginTop: 4 }}
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            placeholder="Optional display name"
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Amount (BDT)
          <input
            style={{ marginTop: 4 }}
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Payment method
          <select
            style={{ marginTop: 4 }}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="bank">Bank transfer</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save donation'}
        </button>

        {success && (
          <div style={{ marginTop: 4, padding: 8, borderRadius: 8, background: '#ecfdf3', color: '#166534' }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 4, padding: 8, borderRadius: 8, background: '#fef2f2', color: '#991b1b' }}>
            {error}
          </div>
        )}
      </form>
    </main>
  );
}


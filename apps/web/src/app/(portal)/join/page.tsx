'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApi } from '@/lib/api';

export default function JoinCommunityPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function formatCode(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const normalized = code.replace(/\s/g, '');
    if (normalized.length !== 16) {
      setError('Please enter a valid 16-digit invite code.');
      return;
    }
    setLoading(true);
    try {
      const api = getApi();
      const res = await api.post<{ community?: { name: string } }>('/invitations/verify', {
        inviteCode: normalized,
        fullName: fullName.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
      });
      if (!res.success) {
        setError((res as { error?: { message?: string } }).error?.message ?? 'Invalid invite code');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace('/communities'), 2000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-page">
      <div className="db-page-header">
        <div>
          <div className="db-page-title">Join a Community</div>
          <div className="db-page-subtitle">Enter your 16-digit invite code to join a Mahfil community</div>
        </div>
      </div>

      <div style={{ maxWidth: 440 }}>
        {success ? (
          <div className="db-table-card" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#22c55e', marginBottom: 6 }}>Joined successfully!</div>
            <div style={{ color: '#5a7d62', fontSize: 14 }}>Redirecting to your communities...</div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="db-table-card" style={{ padding: '24px' }}>
            {error && (
              <div style={{ background: '#3d1111', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Invite Code *</label>
              <input
                className="db-input"
                style={{ width: '100%', letterSpacing: '0.1em', fontFamily: 'monospace', fontSize: 16, textAlign: 'center' }}
                placeholder="XXXX XXXX XXXX XXXX"
                value={code}
                onChange={(e) => setCode(formatCode(e.target.value))}
                maxLength={19}
                required
                autoFocus
              />
              <div style={{ fontSize: 11, color: '#5a7d62', marginTop: 4 }}>Format: 16 digits, spaces optional</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Full Name (optional)</label>
              <input className="db-input" style={{ width: '100%' }} placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>Phone Number (optional)</label>
              <input className="db-input" style={{ width: '100%' }} placeholder="+880..." value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <button type="submit" className="db-btn db-btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Joining...' : 'Join Community'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

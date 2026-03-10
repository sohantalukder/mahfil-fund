'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PageShell } from '../components/shell';

type Profile = {
  name: string;
  email: string;
  initials: string;
  role: string;
  createdAt: string;
};

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const fullName: string = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Admin';
      const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const role = data.user.user_metadata?.role || data.user.app_metadata?.role || 'admin';
      setProfile({
        name: fullName,
        email: data.user.email || '',
        initials,
        role,
        createdAt: data.user.created_at || '',
      });
      setForm((f) => ({ ...f, fullName }));
    });
  }, []);

  async function saveProfile() {
    setSaving(true); setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ data: { full_name: form.fullName } });
    setSaving(false);
    if (error) { setMsg({ type: 'error', text: error.message }); return; }
    setProfile((p) => p ? { ...p, name: form.fullName, initials: form.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) } : p);
    setMsg({ type: 'success', text: 'Profile updated successfully.' });
  }

  async function changePassword() {
    if (form.newPassword !== form.confirmPassword) { setMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    if (form.newPassword.length < 6) { setMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return; }
    setSaving(true); setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: form.newPassword });
    setSaving(false);
    if (error) { setMsg({ type: 'error', text: error.message }); return; }
    setForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    setMsg({ type: 'success', text: 'Password changed successfully.' });
  }

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <PageShell title="My Profile" subtitle="View and update your account information.">
      <div style={{ maxWidth: 560, display: 'grid', gap: 24 }}>
        {msg && (
          <div className={msg.type === 'error' ? 'db-error' : 'db-success'}>
            {msg.text}
          </div>
        )}

        {/* Profile card */}
        <div className="db-table-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div className="db-donor-avatar" style={{ width: 56, height: 56, fontSize: 22, borderRadius: '50%', background: '#1a5c38', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              {profile?.initials || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--db-td-em)' }}>{profile?.name || '—'}</div>
              <div style={{ fontSize: 13, color: 'var(--db-td)' }}>{profile?.email || '—'}</div>
              <div style={{ marginTop: 4 }}>
                <span className="db-stat-badge db-stat-badge-blue">{profile?.role || 'admin'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
            <div>
              <div style={{ color: 'var(--db-td)', marginBottom: 2 }}>Member Since</div>
              <div style={{ color: 'var(--db-td-em)', fontWeight: 500 }}>
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>

          <div className="db-field">
            <label className="db-label">Display Name</label>
            <input className="db-input" value={form.fullName} onChange={(e) => f('fullName', e.target.value)} placeholder="Your name" />
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="db-btn db-btn-primary" type="button" disabled={saving || !form.fullName} onClick={saveProfile}>
              {saving ? 'Saving…' : 'Update Profile'}
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="db-table-card" style={{ padding: 24 }}>
          <div className="db-table-header" style={{ marginBottom: 16 }}>
            <span className="db-table-title">Change Password</span>
          </div>
          <div className="db-field">
            <label className="db-label">New Password</label>
            <input className="db-input" type="password" value={form.newPassword} onChange={(e) => f('newPassword', e.target.value)} placeholder="Min. 6 characters" />
          </div>
          <div className="db-field" style={{ marginTop: 12 }}>
            <label className="db-label">Confirm Password</label>
            <input className="db-input" type="password" value={form.confirmPassword} onChange={(e) => f('confirmPassword', e.target.value)} placeholder="Repeat new password" />
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="db-btn db-btn-primary" type="button"
              disabled={saving || !form.newPassword || !form.confirmPassword} onClick={changePassword}>
              {saving ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

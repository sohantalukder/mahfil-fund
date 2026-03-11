'use client';

import { useEffect, useState } from 'react';

import { getApi } from '@/lib/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Profile = {
  name: string;
  email: string;
  initials: string;
  createdAt: string;
};

const ALL_ROLES = ['super_admin', 'admin', 'collector', 'viewer'] as const;

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

const ROLE_DESC: Record<string, string> = {
  super_admin: 'Full system access including user management and all data operations.',
  admin:       'Can read, write, and delete data across the platform.',
  collector:   'Can record and manage donations and expenses.',
  viewer:      'Read-only access to view reports and data.',
};

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) { setLoading(false); return; }
      const name: string =
        (user.user_metadata as Record<string, string>)?.full_name || user.email?.split('@')[0] || 'Friend';
      const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      setProfile({ name, email: user.email || '', initials, createdAt: user.created_at || '' });
      setFullName(name);
      setLoading(false);
    });

    const api = getApi();
    api.get<{ user?: { roles?: string[] } }>('/me').then((res) => {
      if (res.success) setRoles((res.data as { user?: { roles?: string[] } })?.user?.roles ?? []);
      setRolesLoading(false);
    }).catch(() => setRolesLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaveSuccess(true);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            name: fullName,
            initials: fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          }
        : prev,
    );
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const topRole = roles[0];

  return (
    <div className="animate-page">
      <div className="db-page-header">
        <div>
          <div className="db-page-title">Profile & Roles</div>
          <div className="db-page-subtitle">
            Manage your account and view your assigned access levels.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 20 }}>
        {/* Left: account info + sign out */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="db-card animate-card">
            <div className="db-card-title">Account Info</div>
            <div className="db-card-subtitle">Your identity and membership details.</div>

            {loading ? (
              <div style={{ color: '#5a7d62', fontSize: 13 }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div
                  className="db-avatar"
                  style={{
                    width: 48,
                    height: 48,
                    fontSize: 17,
                    flexShrink: 0,
                    background: topRole ? ROLE_COLOR[topRole] : '#22c55e',
                  }}
                >
                  {profile?.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#e8f0e9' }}>
                    {profile?.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#5a7d62', marginTop: 2 }}>
                    {profile?.email}
                  </div>
                  <div style={{ fontSize: 11, color: '#5a7d62', marginTop: 4 }}>
                    Member since{' '}
                    <span style={{ color: '#c2d9c5' }}>
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="db-field">
              <label className="db-label">Display Name</label>
              <input
                className="db-input"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {saveSuccess && (
              <div className="db-success" style={{ marginTop: 8, marginBottom: 0 }}>
                Name updated successfully.
              </div>
            )}
            {saveError && (
              <div className="db-error" style={{ marginTop: 8, marginBottom: 0 }}>
                {saveError}
              </div>
            )}

            <div className="db-form-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="db-btn db-btn-primary"
                disabled={saving || !fullName}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div
            className="db-card animate-card"
            style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}
          >
            <div className="db-card-title" style={{ color: '#ef4444' }}>Sign Out</div>
            <div className="db-card-subtitle">You can sign in again at any time.</div>
            <button
              type="button"
              className="db-btn db-btn-danger"
              style={{ width: '100%', marginTop: 4 }}
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Right: roles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="db-card animate-card">
            <div className="db-card-title">Your Roles</div>
            <div className="db-card-subtitle">Access levels assigned to your account.</div>

            {rolesLoading ? (
              <div style={{ color: '#5a7d62', fontSize: 13 }}>Loading roles…</div>
            ) : roles.length === 0 ? (
              <div style={{ fontSize: 13, color: '#5a7d62' }}>
                No roles assigned. You have basic member access.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                {roles.map((role) => {
                  const p = ROLE_PERMS[role] ?? { read: true, write: false, del: false, admin: false };
                  const color = ROLE_COLOR[role] || '#6b7280';
                  return (
                    <div
                      key={role}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 14px',
                        border: `1.5px solid ${color}44`,
                        borderRadius: 10,
                        background: color + '0d',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: color + '22',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
                          <circle cx="6" cy="5" r="3" opacity=".8" />
                          <path d="M1 13c0-2.8 2.2-5 5-5h1" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none" />
                          <path d="M11 8l4 4-1.5 1.5L9.5 9.5 11 8z" fill={color} />
                          <path d="M13.5 7a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z" fill={color} opacity=".6" />
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color, fontSize: 14 }}>{fmt(role)}</div>
                        <div style={{ fontSize: 11, color: '#5a7d62', marginTop: 2 }}>
                          {ROLE_DESC[role] || 'Custom role'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {(
                            [
                              p.read  && { label: 'Read',       c: '#22c55e' },
                              p.write && { label: 'Write',      c: '#3b82f6' },
                              p.del   && { label: 'Delete',     c: '#f59e0b' },
                              p.admin && { label: 'User Admin', c: '#7c3aed' },
                            ].filter(Boolean) as { label: string; c: string }[]
                          ).map((perm) => (
                              <span
                                key={perm.label}
                                style={{
                                  fontSize: 10,
                                  padding: '2px 7px',
                                  borderRadius: 99,
                                  background: perm.c + '22',
                                  color: perm.c,
                                  fontWeight: 600,
                                }}
                              >
                                {perm.label}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Role reference table */}
          <div className="db-table-card animate-card">
            <div className="db-table-header">
              <span className="db-table-title">Role Reference</span>
            </div>
            <table className="db-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Read</th>
                  <th>Write</th>
                  <th>Delete</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {ALL_ROLES.map((role) => {
                  const p = ROLE_PERMS[role];
                  const tick = <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>;
                  const dash = <span style={{ color: '#5a7d62' }}>—</span>;
                  const isAssigned = roles.includes(role);
                  return (
                    <tr key={role} style={{ opacity: isAssigned ? 1 : 0.5 }}>
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
                        {isAssigned && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: '#22c55e' }}>
                            ● you
                          </span>
                        )}
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
        </div>
      </div>
    </div>
  );
}

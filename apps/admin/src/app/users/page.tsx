'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApi } from '@/lib/api';
import { PageShell } from '../components/shell';
import { Button } from '../components/ui/button';

type AppUser = {
  id: string;
  email?: string;
  fullName?: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
};

const ALL_ROLES = ['super_admin', 'admin', 'collector', 'viewer'] as const;
type RoleName = typeof ALL_ROLES[number];

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

export default function AdminUsersPage() {
  const api = useMemo(() => getApi(), []);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [me, setMe] = useState<{ id: string; roles: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Invite modal
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', password: '', fullName: '', roles: ['viewer'] as RoleName[] });
  const [inviting, setInviting] = useState(false);

  // Role edit modal
  const [roleModal, setRoleModal] = useState<AppUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<RoleName[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  // Status toggle
  const [togglingId, setTogglingId] = useState('');

  async function load() {
    setLoading(true); setError(null);
    const [usersRes, meRes] = await Promise.all([
      api.get<{ users: AppUser[] }>('/users'),
      api.get<{ user: { id: string; roles: string[] } }>('/me'),
    ]);
    setLoading(false);
    if (!usersRes.success) { setError(usersRes.error.message); return; }
    if (meRes.success) {
      const meData = meRes.data as { user?: { id: string; roles: string[] } } | { id: string; roles: string[] };
      setMe((meData as { user?: { id: string; roles: string[] } }).user ?? (meData as { id: string; roles: string[] }));
    }
    const ud = usersRes.data as { users?: AppUser[] } | AppUser[];
    const list: AppUser[] = Array.isArray(ud) ? ud : (ud.users ?? []);
    setUsers(list);
  }

  useEffect(() => {
    (async () => { await load(); })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function invite() {
    setInviting(true); setError(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteForm.email,
        password: inviteForm.password,
        fullName: inviteForm.fullName || null,
        roles: inviteForm.roles
      }),
    });
    setInviting(false);
    const d = await res.json();
    if (!res.ok) { setError(d.error || 'Invite failed'); return; }
    setInviteModal(false);
    setInviteForm({ email: '', password: '', fullName: '', roles: ['viewer'] });
    alert(`User created: ${inviteForm.email}`);
  }

  function toggleInviteRole(role: RoleName) {
    setInviteForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role]
    }));
  }

  function openRoleEdit(u: AppUser) {
    setSelectedRoles(u.roles as RoleName[]);
    setRoleModal(u);
  }

  function toggleRole(role: RoleName) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function saveRoles() {
    if (!roleModal) return;
    setSavingRoles(true); setError(null);
    const res = await api.patch(`/users/${roleModal.id}/roles`, { roles: selectedRoles });
    setSavingRoles(false);
    if (!res.success) { setError(res.error.message); return; }
    setRoleModal(null);
    load();
  }

  async function toggleStatus(u: AppUser) {
    setTogglingId(u.id);
    const res = await api.patch(`/users/${u.id}/status`, { isActive: !u.isActive });
    setTogglingId('');
    if (!res.success) { setError(res.error.message); return; }
    load();
  }

  const isSuperAdmin = me?.roles.includes('super_admin') ?? false;

  return (
    <PageShell
      title="User Management"
      subtitle="Manage staff accounts, roles, and access control."
      actions={
        <Button type="button" onClick={() => setInviteModal(true)}>
          + Create User
        </Button>
      }
    >
      {error && <div className="db-error">{error}</div>}

      {/* Stats */}
      <div className="db-stat-grid animate-page" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {ALL_ROLES.map((role) => (
          <div className="db-stat-card animate-card" key={role}>
            <div className="db-stat-title">{fmt(role)}s</div>
            <div className="db-stat-value" style={{ color: ROLE_COLOR[role], fontSize: 28 }}>
              {users.filter((u) => u.roles.includes(role)).length}
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="db-table-card animate-card">
        <div className="db-table-header">
          <span className="db-table-title">All Users</span>
          <span className="db-stat-badge db-stat-badge-blue">{users.length} members</span>
        </div>
        {users.length === 0 && !loading ? (
          <div className="db-empty">No users found.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const initials = ((u.fullName || u.email || 'U').split(/[\s@]/)[0]).slice(0, 2).toUpperCase();
                const topRole = ALL_ROLES.find((r) => u.roles.includes(r)) || 'viewer';
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.55 }}>
                    <td>
                      <div className="db-donor-cell">
                        <div className="db-donor-avatar"
                          style={{ background: ROLE_COLOR[topRole] || '#1a5c38' }}>
                          {initials}
                        </div>
                        <div>
                          <span style={{ color: 'var(--db-td-em)', fontWeight: 500 }}>
                            {u.fullName || '—'}
                          </span>
                          {isMe && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: '#059669' }}>● you</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{u.email || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {u.roles.length === 0
                          ? <span style={{ color: 'var(--db-td)', fontSize: 12 }}>No roles</span>
                          : u.roles.map((role) => (
                            <span key={role} className="db-stat-badge"
                              style={{ background: (ROLE_COLOR[role] || '#6b7280') + '22', color: ROLE_COLOR[role] || '#6b7280' }}>
                              {fmt(role)}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td>
                      <span className={u.isActive ? 'db-status-active' : 'db-status-archived'}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {/* Edit Roles */}
                        <button
                          type="button"
                          disabled={!isSuperAdmin}
                          onClick={() => openRoleEdit(u)}
                          title={isSuperAdmin ? 'Edit roles' : 'Requires super_admin role'}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', borderRadius: 6, border: '1px solid var(--db-card-bd)',
                            background: 'var(--db-btn-bg)', color: '#2563eb',
                            fontSize: 12, fontWeight: 500, cursor: isSuperAdmin ? 'pointer' : 'not-allowed',
                            opacity: isSuperAdmin ? 1 : 0.4,
                          }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <circle cx="6" cy="5" r="3" fill="currentColor" opacity=".8"/>
                            <path d="M1 13c0-2.8 2.2-5 5-5h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                            <path d="M11 8l4 4-1.5 1.5L9.5 9.5 11 8z" fill="currentColor"/>
                            <path d="M13.5 7a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z" fill="currentColor" opacity=".6"/>
                          </svg>
                          Roles
                        </button>

                        {/* Enable / Disable */}
                        <button
                          type="button"
                          disabled={!isSuperAdmin || isMe || togglingId === u.id}
                          onClick={() => toggleStatus(u)}
                          title={isMe ? 'Cannot change your own status' : (u.isActive ? 'Disable account' : 'Enable account')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', borderRadius: 6, border: '1px solid var(--db-card-bd)',
                            background: 'var(--db-btn-bg)',
                            color: u.isActive ? '#dc2626' : '#059669',
                            fontSize: 12, fontWeight: 500,
                            cursor: (!isSuperAdmin || isMe) ? 'not-allowed' : 'pointer',
                            opacity: (!isSuperAdmin || isMe) ? 0.4 : 1,
                          }}>
                          {togglingId === u.id
                            ? <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6" opacity=".3"/><path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                            : u.isActive
                            ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                                <line x1="5" y1="5" x2="11" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                <line x1="11" y1="5" x2="5" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                              </svg>
                            : <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                                <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                          }
                          {togglingId === u.id ? '…' : (u.isActive ? 'Disable' : 'Enable')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Role permission reference */}
      <div className="db-table-card" style={{ marginTop: 20 }}>
        <div className="db-table-header">
          <span className="db-table-title">Role Permissions</span>
        </div>
        <table className="db-table">
          <thead>
            <tr><th>Role</th><th>Read</th><th>Write / Create</th><th>Delete</th><th>User Admin</th></tr>
          </thead>
          <tbody>
            {ALL_ROLES.map((role) => {
              const p = ROLE_PERMS[role];
              const tick = <span style={{ color: '#059669' }}>✓</span>;
              const dash = <span style={{ color: 'var(--db-td)' }}>—</span>;
              return (
                <tr key={role}>
                  <td>
                    <span className="db-stat-badge"
                      style={{ background: ROLE_COLOR[role] + '22', color: ROLE_COLOR[role] }}>
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

      {/* Invite modal */}
      {inviteModal && (
        <div className="db-overlay" onClick={(e) => e.target === e.currentTarget && setInviteModal(false)}>
          <div className="db-modal animate-modal">
            <div className="db-modal-title">Invite User</div>
            <p style={{ fontSize: 13, color: 'var(--db-td)', marginBottom: 16 }}>
              Create a new user account with initial roles.
            </p>
            <div className="db-field">
              <label className="db-label">Email *</label>
              <input className="db-input" type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com" />
            </div>
            <div className="db-field" style={{ marginTop: 12 }}>
              <label className="db-label">Password *</label>
              <input className="db-input" type="password"
                value={inviteForm.password}
                onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Minimum 8 characters" />
            </div>
            <div className="db-field" style={{ marginTop: 12 }}>
              <label className="db-label">Full Name</label>
              <input className="db-input"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Optional" />
            </div>
            <div className="db-field" style={{ marginTop: 12 }}>
              <label className="db-label">Initial Roles *</label>
              <div style={{ display: 'grid', gap: 8 }}>
                {ALL_ROLES.map((role) => (
                  <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={inviteForm.roles.includes(role)}
                      onChange={() => toggleInviteRole(role)}
                    />
                    {fmt(role)}
                  </label>
                ))}
              </div>
            </div>
            <div className="db-form-actions">
              <Button type="button" variant="outline" onClick={() => setInviteModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={inviting || !inviteForm.email || inviteForm.password.length < 8 || inviteForm.roles.length === 0}
                onClick={invite}
              >
                {inviting ? 'Creating…' : 'Create User'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role edit modal */}
      {roleModal && (
        <div className="db-overlay" onClick={(e) => e.target === e.currentTarget && setRoleModal(null)}>
          <div className="db-modal animate-modal">
            <div className="db-modal-title">
              Edit Roles — {roleModal.fullName || roleModal.email || roleModal.id.slice(0, 8)}
            </div>
            <p style={{ fontSize: 13, color: 'var(--db-td)', marginBottom: 16 }}>
              Select one or more roles. Changes take effect on the user&apos;s next request.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {ALL_ROLES.map((role) => {
                const checked = selectedRoles.includes(role);
                const p = ROLE_PERMS[role];
                return (
                  <label key={role} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    border: `1.5px solid ${checked ? ROLE_COLOR[role] : 'var(--db-card-bd)'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: checked ? ROLE_COLOR[role] + '11' : 'transparent',
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleRole(role)}
                      style={{ width: 16, height: 16, accentColor: ROLE_COLOR[role] }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: checked ? ROLE_COLOR[role] : 'var(--db-td-em)', fontSize: 14 }}>
                        {fmt(role)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--db-td)', marginTop: 2 }}>
                        {[p.read && 'Read', p.write && 'Write', p.del && 'Delete', p.admin && 'User Admin'].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {checked && <span style={{ color: ROLE_COLOR[role], fontWeight: 700 }}>✓</span>}
                  </label>
                );
              })}
            </div>
            <div className="db-form-actions">
              <Button type="button" variant="outline" onClick={() => setRoleModal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={savingRoles}
                onClick={saveRoles}
              >
                {savingRoles ? 'Saving…' : 'Save Roles'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

'use client';

import { useState } from 'react';
import { useTheme } from '../providers';
import { PageShell } from '../components/shell';

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  return (
    <PageShell title="Settings" subtitle="Manage appearance preferences for the admin panel.">
      <div style={{ maxWidth: 560, display: 'grid', gap: 24 }}>
        {/* Theme */}
        <div className="db-table-card" style={{ padding: 24 }}>
          <div className="db-table-header" style={{ marginBottom: 16 }}>
            <span className="db-table-title">Appearance</span>
          </div>
          <div className="db-field">
            <label className="db-label">Theme</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className={'db-btn' + (theme === 'light' ? ' db-btn-primary' : '')}
                disabled={saving}
                onClick={() => {
                  setSaving(true);
                  setTheme('light');
                  setTimeout(() => setSaving(false), 300);
                }}
              >
                ☀ Light
              </button>
              <button
                type="button"
                className={'db-btn' + (theme === 'dark' ? ' db-btn-primary' : '')}
                disabled={saving}
                onClick={() => {
                  setSaving(true);
                  setTheme('dark');
                  setTimeout(() => setSaving(false), 300);
                }}
              >
                ● Dark
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--db-td)', marginTop: 8 }}>
              {saving ? 'Applying theme…' : 'Changes apply immediately.'}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="db-table-card" style={{ padding: 24 }}>
          <div className="db-table-header" style={{ marginBottom: 16 }}>
            <span className="db-table-title">About</span>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--db-td)' }}>Application</span>
              <span style={{ color: 'var(--db-td-em)', fontWeight: 500 }}>Mahfil Fund Admin</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--db-td)' }}>Version</span>
              <span style={{ color: 'var(--db-td-em)', fontWeight: 500 }}>1.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--db-td)' }}>Environment</span>
              <span style={{ color: 'var(--db-td-em)', fontWeight: 500 }}>{process.env.NODE_ENV}</span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

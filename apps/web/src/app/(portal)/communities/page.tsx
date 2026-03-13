'use client';

import Link from 'next/link';
import { useCommunity } from '../../providers';

const ROLE_COLOR: Record<string, string> = {
  super_admin: '#7c3aed',
  admin: '#2563eb',
  collector: '#059669',
  viewer: '#6b7280',
};

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function CommunitiesPage() {
  const { communities, activeCommunity, setActiveCommunity } = useCommunity();

  return (
    <div className="animate-page">
      <div className="db-page-header">
        <div>
          <div className="db-page-title">My Communities</div>
          <div className="db-page-subtitle">Communities you are a member of</div>
        </div>
        <div className="db-header-actions">
          <Link href="/join" className="db-btn db-btn-primary">+ Join Community</Link>
        </div>
      </div>

      {communities.length === 0 ? (
        <div className="db-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🕌</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#e8f0e9', marginBottom: 8 }}>No communities yet</div>
          <div style={{ color: '#5a7d62', marginBottom: 24, fontSize: 14 }}>
            Ask a community admin to send you an invite code, or join an existing one.
          </div>
          <Link href="/join" className="db-btn db-btn-primary">Join with Invite Code</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {communities.map((community) => {
            const isActive = activeCommunity?.id === community.id;
            return (
              <div
                key={community.id}
                className="db-table-card"
                style={{ padding: '20px', cursor: 'pointer', border: isActive ? '2px solid #22c55e' : '2px solid transparent', transition: 'border-color 0.2s' }}
                onClick={() => setActiveCommunity(community)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0d1f11', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    🕌
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e8f0e9', marginBottom: 2 }}>{community.name}</div>
                    <div style={{ fontSize: 11, color: '#5a7d62' }}>/{community.slug}</div>
                  </div>
                  {isActive && (
                    <span style={{ background: '#14532d', color: '#22c55e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>Active</span>
                  )}
                </div>

                {community.role && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>Your role:</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLOR[community.role] ?? '#9CA3AF', background: `${ROLE_COLOR[community.role] ?? '#9CA3AF'}18`, padding: '2px 8px', borderRadius: 6 }}>
                      {fmt(community.role)}
                    </span>
                  </div>
                )}

                {!isActive && (
                  <button
                    className="db-btn db-btn-primary"
                    style={{ width: '100%', marginTop: 12, fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); setActiveCommunity(community); }}
                  >
                    Switch to this community
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

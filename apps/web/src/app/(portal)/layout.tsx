'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { getApi } from '@/lib/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type UserInfo = {
  name: string;
  email: string;
  initials: string;
  roles: string[];
};

const ROLE_COLOR: Record<string, string> = {
  super_admin: '#7c3aed',
  admin: '#2563eb',
  collector: '#059669',
  viewer: '#6b7280',
};

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" opacity=".7" />
      </svg>
    ),
  },
  {
    href: '/donations',
    label: 'My Donations',
    exact: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="2" y="3" width="12" height="10" rx="2" />
        <path d="M5 7h6M5 10h4" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile & Roles',
    exact: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
      </svg>
    ),
  },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const authUser = data.user;
      if (!authUser) {
        router.replace('/login');
        return;
      }
      const name =
        (authUser.user_metadata as Record<string, string>)?.full_name ||
        authUser.email?.split('@')[0] ||
        'User';
      const initials = name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      try {
        const api = getApi();
        const meRes = await api.get<{ user?: { roles?: string[] } }>('/me');
        const roles: string[] = meRes.success ? (meRes.data as { user?: { roles?: string[] } })?.user?.roles ?? [] : [];
        setUser({ name, email: authUser.email || '', initials, roles });
      } catch {
        setUser({ name, email: authUser.email || '', initials, roles: [] });
      }
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const activeItem = NAV_ITEMS.find((item) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href),
  );
  const topRole = user?.roles[0];

  const Sidebar = (
    <aside className="db-sidebar">
      <div className="db-sidebar-brand">
        <div className="db-sidebar-icon">🕌</div>
        <div className="db-sidebar-brand-text">
          <span className="db-sidebar-brand-name">Mahfil Fund</span>
          <span className="db-sidebar-brand-role">User Portal</span>
        </div>
      </div>

      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`db-nav-link${active ? ' active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}

      <div className="db-sidebar-spacer" />

      {user && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 8px 6px',
            borderTop: '1px solid #1b2e1f',
            marginTop: 8,
          }}
        >
          <div
            className="db-avatar"
            style={{
              width: 30,
              height: 30,
              fontSize: 11,
              background: topRole ? ROLE_COLOR[topRole] : '#22c55e',
            }}
          >
            {user.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#e8f0e9',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: 10, color: topRole ? ROLE_COLOR[topRole] : '#5a7d62' }}>
              {topRole ? fmt(topRole) : 'Member'}
              {user.roles.length > 1 ? ` +${user.roles.length - 1}` : ''}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSignOut}
        className="db-nav-link"
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginTop: 4,
          color: '#ef4444',
        }}
      >
        <svg viewBox="0 0 16 16" fill="none" className="db-nav-icon">
          <path
            d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M11 5l3 3-3 3M14 8H6"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Sign Out
      </button>
    </aside>
  );

  return (
    <div className={`db-shell up-portal${sidebarOpen ? ' up-sidebar-open' : ''}`}>
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="up-sidebar-drawer">{Sidebar}</div>
      <div className="up-sidebar-static">{Sidebar}</div>

      <div className="db-main">
        <header className="db-topbar">
          <button
            type="button"
            className="db-icon-btn up-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="2" y1="4.5" x2="14" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="2" y1="11.5" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e8f0e9', letterSpacing: '-0.01em' }}>
              {activeItem?.label ?? 'User Portal'}
            </div>
          </div>

          {user && (
            <div className="db-topbar-user">
              <div className="db-topbar-user-text">
                <span className="db-topbar-user-name">{user.name}</span>
                <span className="db-topbar-user-role">
                  {user.roles.length > 0 ? user.roles.map(fmt).join(', ') : 'Member'}
                </span>
              </div>
              <div
                className="db-avatar"
                style={{ background: topRole ? ROLE_COLOR[topRole] : '#22c55e' }}
              >
                {user.initials}
              </div>
            </div>
          )}
        </header>

        <div className="db-content">{children}</div>
      </div>
    </div>
  );
}

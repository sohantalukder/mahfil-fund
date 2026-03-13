'use client';

import { type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/events',
    label: 'Events',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <line x1="5" y1="1.5" x2="5" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="11" y1="1.5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    href: '/donors',
    label: 'Donors',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
      </svg>
    ),
  },
  {
    href: '/donations',
    label: 'Donations',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="2" y="3" width="12" height="10" rx="2" />
        <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Expenses',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <path d="M2 4h12l-1.5 8H3.5L2 4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="5.5" cy="14" r="1" />
        <circle cx="10.5" cy="14" r="1" />
        <path d="M1 2h2l.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="1" y="10" width="3" height="5" rx="0.5" />
        <rect x="6" y="6" width="3" height="9" rx="0.5" />
        <rect x="11" y="2" width="3" height="13" rx="0.5" />
      </svg>
    ),
  },
  {
    href: '/users',
    label: 'Users',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <circle cx="6" cy="5" r="2.5" />
        <circle cx="11" cy="5" r="2" />
        <path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5H1z" />
        <path d="M11 8c1.7.4 3 1.9 3 3.7v1.3h-2" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    href: '/audit-logs',
    label: 'Audit Logs',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 6h6M5 9h4M5 12h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <circle cx="8" cy="8" r="2" />
        <path
          d="M8 1.5l1 2a5 5 0 0 1 1.2.7l2-.5.7 1.2-1.5 1.5a5 5 0 0 1 0 1.2l1.5 1.5-.7 1.2-2-.5A5 5 0 0 1 9 9.5l-1 2H7l-1-2a5 5 0 0 1-1.2-.7l-2 .5-.7-1.2 1.5-1.5a5 5 0 0 1 0-1.2L2.1 3.9l.7-1.2 2 .5A5 5 0 0 1 7 2.5L8 .5v1z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    ),
  },
];

type User = { name: string; email: string; initials: string };

export function PageShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User>({ name: 'Admin', email: '', initials: 'AF' });
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { method: 'GET', cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          router.replace('/login');
          return null;
        }
        const data = (await res.json()) as { user?: { email?: string; fullName?: string | null } };
        return data.user ?? null;
      })
      .then((authUser) => {
        if (!authUser) return;
        const fullName: string = authUser.fullName || authUser.email?.split('@')[0] || 'Admin';
        const initials = fullName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        setUser({ name: fullName, email: authUser.email || '', initials });
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <div className="db-shell">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-brand">
          <div className="db-sidebar-icon">🕌</div>
          <div className="db-sidebar-brand-text">
            <span className="db-sidebar-brand-name">Iftar Manager</span>
            <span className="db-sidebar-brand-role">Admin Control Panel</span>
          </div>
        </div>

        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={'db-nav-link' + (active ? ' active' : '')}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        <div className="db-sidebar-spacer" />

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="db-nav-link"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
            <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M11 5l3 3-3 3M14 8H6" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign Out
        </button>

        {/* Target progress */}
        <div className="db-target-box">
          <div className="db-target-label">Target Progress</div>
          <div className="db-target-bar-track">
            <div className="db-target-bar-fill" style={{ width: '75%' }} />
          </div>
          <div className="db-target-caption">75% of Ramadan Goal</div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="db-main">
        {/* Topbar */}
        <header className="db-topbar">
          <div className="db-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              placeholder="Search donors, events, expenses…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = searchValue.trim();
                  if (!q) return;
                  const url = `/donors?search=${encodeURIComponent(q)}`;
                  if (pathname === '/donors') {
                    router.replace(url);
                  } else {
                    router.push(url);
                  }
                }
              }}
            />
          </div>
          <div className="db-topbar-spacer" />
          <button className="db-icon-btn" type="button" aria-label="Notifications">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a5 5 0 0 0-5 5v3l-1.5 2h13L13 9V6a5 5 0 0 0-5-5z" />
              <path d="M6.5 14a1.5 1.5 0 0 0 3 0H6.5z" />
            </svg>
          </button>
          <Link href="/profile" className="db-topbar-user">
            <div className="db-topbar-user-text">
              <span className="db-topbar-user-name">{user.name}</span>
              <span className="db-topbar-user-role">{user.email}</span>
            </div>
            <div className="db-avatar">{user.initials}</div>
          </Link>
        </header>

        {/* Content */}
        <div className="db-content">
          <div className="db-page-header">
            <div>
              <div className="db-page-title">{title}</div>
              {subtitle && <div className="db-page-subtitle">{subtitle}</div>}
            </div>
            {actions && <div className="db-header-actions">{actions}</div>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

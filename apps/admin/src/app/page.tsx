'use client';

import Link from 'next/link';

const NAV_LINKS = [
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
    href: '/expenses',
    label: 'Expenses',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <path d="M1 4h14v2H1zM3 8h10v1H3zM5 11h6v1H5z" />
        <rect x="1" y="3" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
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
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="db-nav-icon">
        <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
        <path fillRule="evenodd" d="M6.5 1h3l.4 1.6a5 5 0 0 1 1.2.7l1.6-.5 1.5 2.6-1.2 1.1a5 5 0 0 1 0 1.4l1.2 1.1-1.5 2.6-1.6-.5a5 5 0 0 1-1.2.7L9.5 15h-3l-.4-1.6a5 5 0 0 1-1.2-.7l-1.6.5L1.8 10.6l1.2-1.1a5 5 0 0 1 0-1.4L1.8 6.9l1.5-2.6 1.6.5a5 5 0 0 1 1.2-.7L6.5 1zm1.5 3a4 4 0 1 0 0 8A4 4 0 0 0 8 4z" />
      </svg>
    ),
  },
];

const CHART_DATA = [
  { month: 'Jan', collections: 1800, expenses: 1200 },
  { month: 'Feb', collections: 1600, expenses: 1400 },
  { month: 'Mar', collections: 2400, expenses: 1600 },
  { month: 'Apr', collections: 2000, expenses: 1200 },
  { month: 'May', collections: 2800, expenses: 1800 },
  { month: 'Jun', collections: 2200, expenses: 1800 },
];

const CHART_MAX = 3000;

const EXPENSE_CATEGORIES = [
  { name: 'Catering & Food', amount: '$4,500', pct: 55, color: '#22c55e' },
  { name: 'Venue & Setup', amount: '$2,100', pct: 26, color: '#4ade80' },
  { name: 'Logistics', amount: '$1,200', pct: 15, color: '#86efac' },
  { name: 'Marketing', amount: '$400', pct: 5, color: '#bbf7d0' },
];

const RECENT_DONATIONS = [
  { initials: 'ZA', name: 'Zakir Ahmed', amount: '$500.00', date: 'Mar 12, 2024', status: 'Confirmed' },
  { initials: 'MH', name: 'Mahmud Hossain', amount: '$250.00', date: 'Mar 11, 2024', status: 'Confirmed' },
  { initials: 'FK', name: 'Fatima Khatun', amount: '$1,000.00', date: 'Mar 10, 2024', status: 'Pending' },
  { initials: 'RA', name: 'Rahim Ali', amount: '$150.00', date: 'Mar 9, 2024', status: 'Confirmed' },
];

export default function AdminDashboard() {
  return (
    <div className="db-shell">
      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-sidebar-brand">
          <div className="db-sidebar-icon">🕌</div>
          <div className="db-sidebar-brand-text">
            <span className="db-sidebar-brand-name">Iftar Manager</span>
            <span className="db-sidebar-brand-role">Admin Control Panel</span>
          </div>
        </div>

        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={'db-nav-link' + (link.href === '/' ? ' active' : '')}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}

        <div className="db-sidebar-spacer" />

        <div className="db-target-box">
          <div className="db-target-label">Target Progress</div>
          <div className="db-target-bar-track">
            <div className="db-target-bar-fill" style={{ width: '75%' }} />
          </div>
          <div className="db-target-caption">75% of Ramadan Goal</div>
        </div>
      </aside>

      {/* Main */}
      <div className="db-main">
        {/* Top bar */}
        <header className="db-topbar">
          <div className="db-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#4d6e52">
              <circle cx="6.5" cy="6.5" r="5" stroke="#4d6e52" strokeWidth="1.5" fill="none" />
              <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="#4d6e52" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input placeholder="Search donors, transactions or reports…" />
          </div>
          <div className="db-topbar-spacer" />
          <button className="db-icon-btn" type="button" aria-label="Notifications">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a5 5 0 0 0-5 5v3l-1.5 2H14.5L13 9V6a5 5 0 0 0-5-5z" />
              <path d="M6.5 14a1.5 1.5 0 0 0 3 0H6.5z" />
            </svg>
          </button>
          <button className="db-icon-btn" type="button" aria-label="Calendar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <line x1="5" y1="1.5" x2="5" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="11" y1="1.5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          <div className="db-topbar-user">
            <div className="db-topbar-user-text">
              <span className="db-topbar-user-name">Ahmadullah Fazli</span>
              <span className="db-topbar-user-role">Chief Organizer</span>
            </div>
            <div className="db-avatar">AF</div>
          </div>
        </header>

        {/* Content */}
        <div className="db-content">
          {/* Page header */}
          <div className="db-page-header">
            <div>
              <div className="db-page-title">Dashboard Overview</div>
              <div className="db-page-subtitle">Welcome back, here&apos;s what&apos;s happening with the Iftar Mahfil.</div>
            </div>
            <div className="db-header-actions">
              <button className="db-btn" type="button">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
                Add Expense
              </button>
              <Link href="/donors" className="db-btn db-btn-primary">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
                New Donation
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div className="db-stat-grid">
            <div className="db-stat-card">
              <div className="db-stat-top">
                <div className="db-stat-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="4" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className="db-stat-badge db-stat-badge-green">+12.5%</span>
              </div>
              <div className="db-stat-title">Total Collections</div>
              <div className="db-stat-value">$12,450.00</div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-top">
                <div className="db-stat-icon" style={{ color: '#f59e0b' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 4h12l-1.5 8H3.5L2 4z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="5.5" cy="14" r="1" />
                    <circle cx="10.5" cy="14" r="1" />
                    <path d="M1 2h2l.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className="db-stat-badge db-stat-badge-red">+4.2%</span>
              </div>
              <div className="db-stat-title">Total Expenses</div>
              <div className="db-stat-value">$8,200.50</div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-top">
                <div className="db-stat-icon" style={{ color: '#60a5fa' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <span className="db-stat-badge db-stat-badge-green">+18.1%</span>
              </div>
              <div className="db-stat-title">Current Balance</div>
              <div className="db-stat-value">$4,249.50</div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-top">
                <div className="db-stat-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="6" cy="5" r="2.5" />
                    <circle cx="11" cy="5" r="2" />
                    <path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5H1z" />
                    <path d="M11 8c1.7.4 3 1.9 3 3.7v1.3h-2.5" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
                <span className="db-stat-badge db-stat-badge-blue">+8 New</span>
              </div>
              <div className="db-stat-title">Total Donors</div>
              <div className="db-stat-value">156</div>
            </div>
          </div>

          {/* Chart + Categories row */}
          <div className="db-bottom-row">
            {/* Bar chart */}
            <div className="db-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="db-card-title">Collection vs Expenses</div>
                  <div className="db-card-subtitle">Monthly breakdown for 2024</div>
                </div>
                <span style={{ fontSize: 11, color: '#5a7d62', background: '#1e3226', padding: '3px 8px', borderRadius: 6 }}>
                  Last 6 Months
                </span>
              </div>
              <div className="db-chart-wrap">
                {CHART_DATA.map((d) => (
                  <div key={d.month} className="db-chart-group">
                    <div className="db-chart-bars">
                      <div
                        className="db-bar db-bar-collections"
                        style={{ height: `${(d.collections / CHART_MAX) * 110}px` }}
                      />
                      <div
                        className="db-bar db-bar-expenses"
                        style={{ height: `${(d.expenses / CHART_MAX) * 110}px` }}
                      />
                    </div>
                    <div className="db-chart-month">{d.month}</div>
                  </div>
                ))}
              </div>
              <div className="db-chart-legend">
                <div className="db-legend-item">
                  <div className="db-legend-dot" style={{ background: '#22c55e' }} />
                  Collections
                </div>
                <div className="db-legend-item">
                  <div className="db-legend-dot" style={{ background: '#f59e0b' }} />
                  Expenses
                </div>
              </div>
            </div>

            {/* Expense categories */}
            <div className="db-card">
              <div className="db-card-title">Expense Categories</div>
              <div className="db-card-subtitle" style={{ marginBottom: 16 }}> </div>
              <div className="db-cat-list">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <div key={cat.name} className="db-cat-row">
                    <div className="db-cat-header">
                      <span className="db-cat-name">{cat.name}</span>
                      <span className="db-cat-amount">{cat.amount}</span>
                    </div>
                    <div className="db-cat-track">
                      <div
                        className="db-cat-fill"
                        style={{ width: `${cat.pct}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button className="db-download-btn" type="button">
                Download Full Expense Report
              </button>
            </div>
          </div>

          {/* Recent donations */}
          <div className="db-table-card">
            <div className="db-table-header">
              <span className="db-table-title">Recent Donations</span>
              <Link href="/donors" className="db-view-all">View All</Link>
            </div>
            <table className="db-table">
              <thead>
                <tr>
                  <th>Donor Name</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_DONATIONS.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <div className="db-donor-cell">
                        <div className="db-donor-avatar">{row.initials}</div>
                        {row.name}
                      </div>
                    </td>
                    <td style={{ color: '#e8f0e9', fontWeight: 500 }}>{row.amount}</td>
                    <td>{row.date}</td>
                    <td>
                      <span className={row.status === 'Confirmed' ? 'db-status-confirmed' : 'db-status-pending'}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <button className="db-action-btn" type="button" aria-label="More options">⋮</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

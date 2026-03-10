import type { ReactNode } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

type Props = {
  children: ReactNode;
};

const NAV_ITEMS = [
  { href: '/user', label: 'Home' },
  { href: '/user/donations', label: 'Donations' },
  { href: '/user/profile', label: 'Profile' },
] as const;

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="up-nav-bottom">
      <div className="up-nav-inner">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === '/user'
              ? pathname === '/user'
              : pathname?.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href} className="up-nav-item">
              <span className="up-nav-dot" data-active={active ? 'true' : 'false'} />
              <span className={active ? 'up-nav-label up-nav-label-active' : 'up-nav-label'}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function UserLayout({ children }: Props) {
  return (
    <div className="up-shell">
      <header className="up-header">
        <div className="up-header-main">
          <div className="up-logo">🕌</div>
          <div className="up-title-group">
            <div className="up-title">Mahfil Fund</div>
            <div className="up-subtitle">User Panel</div>
          </div>
        </div>
        <div className="up-header-cta">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden xs:inline-flex rounded-full px-3 text-xs"
          >
            <Link href="/user/donations">Give sadaqah</Link>
          </Button>
        </div>
      </header>

      <main className="up-main">
        <div className="up-main-inner">
          <Card className="up-main-card">
            {children}
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}


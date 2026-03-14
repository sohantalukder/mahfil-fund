import type { ReactNode } from 'react';
import styles from './shared.module.css';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  children: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function StatCard({ label, children, badge, icon, className }: StatCardProps) {
  return (
    <div className={cn(styles.statCard, className)}>
      {(icon ?? badge) && (
        <div className="flex justify-between items-center mb-2">
          {icon && <span className="text-primary">{icon}</span>}
          {badge && <span>{badge}</span>}
        </div>
      )}
      <div className={styles.statTitle}>{label}</div>
      <div className={styles.statValue}>{children}</div>
    </div>
  );
}

const COLS_CLASS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

type StatGridProps = {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
};

export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  return (
    <div className={cn(styles.statGrid, COLS_CLASS[columns], className)}>
      {children}
    </div>
  );
}

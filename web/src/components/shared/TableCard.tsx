import type { ReactNode } from 'react';
import styles from './shared.module.css';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'green' | 'blue' | 'red' | 'muted' | 'primary';

const BADGE_CLASS: Record<BadgeVariant, string> = {
  default: styles.countBadge,
  green: `${styles.statusBadge} ${styles.badgeSuccess}`,
  blue: `${styles.statusBadge} ${styles.badgeInfo}`,
  red: `${styles.statusBadge} ${styles.badgeDanger}`,
  muted: `${styles.statusBadge} ${styles.badgeMuted}`,
  primary: `${styles.statusBadge} ${styles.badgePrimary}`,
};

type TableCardProps = {
  title: string;
  badge?: ReactNode;
  badgeVariant?: BadgeVariant;
  actions?: ReactNode;
  children?: ReactNode;
  empty?: string;
  className?: string;
};

export function TableCard({
  title,
  badge,
  badgeVariant = 'default',
  actions,
  children,
  empty,
  className,
}: TableCardProps) {
  return (
    <div className={cn(styles.tableCard, 'mb-6', className)}>
      <div className={styles.tableHeader}>
        <span className={styles.tableTitle}>{title}</span>
        <div className="flex items-center gap-2">
          {badge && <span className={BADGE_CLASS[badgeVariant]}>{badge}</span>}
          {actions}
        </div>
      </div>
      {empty ? (
        <div className={styles.emptyState}>{empty}</div>
      ) : (
        children
      )}
    </div>
  );
}

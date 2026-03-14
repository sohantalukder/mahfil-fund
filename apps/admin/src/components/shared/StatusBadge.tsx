import { cn } from '@/lib/utils';
import styles from './shared.module.css';

type Variant = 'success' | 'warning' | 'danger' | 'muted' | 'info' | 'primary';

function getVariant(status: string): Variant {
  const s = status.toUpperCase();
  if (['ACTIVE', 'ISSUED', 'USED', 'CREATE'].includes(s)) return 'success';
  if (['INACTIVE', 'ARCHIVED', 'EXPIRED', 'CANCELLED', 'SUSPENDED'].includes(s)) return 'muted';
  if (['PENDING', 'DRAFT', 'WARNING', 'RESTORE', 'UPDATE'].includes(s)) return 'warning';
  if (['ERROR', 'CRITICAL', 'DELETE'].includes(s)) return 'danger';
  if (['INFO'].includes(s)) return 'info';
  return 'primary';
}

const VARIANT_CLASS: Record<Variant, string> = {
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger:  styles.badgeDanger,
  muted:   styles.badgeMuted,
  info:    styles.badgeInfo,
  primary: styles.badgePrimary,
};

type Props = {
  status: string;
  variant?: Variant;
  className?: string;
};

export function StatusBadge({ status, variant, className }: Props) {
  const v = variant ?? getVariant(status);
  return (
    <span className={cn(styles.statusBadge, VARIANT_CLASS[v], className)}>
      {status}
    </span>
  );
}

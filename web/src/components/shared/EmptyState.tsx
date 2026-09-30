import type { ReactNode } from 'react';
import styles from './shared.module.css';
import { cn } from '@/lib/utils';

type Props = {
  message: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({ message, children, className }: Props) {
  return (
    <div className={cn(styles.emptyState, className)}>
      <p>{message}</p>
      {children}
    </div>
  );
}

import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-subtle/70 bg-surface shadow-sm',
        'p-4 md:p-5',
        className,
      )}
      {...props}
    />
  );
}


import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'error' | 'info';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  default: 'border-border-subtle bg-muted text-foreground',
  success: 'border-emerald-500/40 bg-emerald-50 text-emerald-900',
  error: 'border-red-500/40 bg-red-50 text-red-900',
  info: 'border-sky-500/40 bg-sky-50 text-sky-900',
};

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-md border px-3 py-2 text-sm',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}


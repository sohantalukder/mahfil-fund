import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-md border border-border-subtle/70 bg-surface px-3 py-1.5 text-sm text-foreground shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'pr-8 appearance-none bg-no-repeat bg-[right_0.6rem_center] bg-[length:12px_12px]',
          className,
        )}
        {...props}
      />
    );
  },
);

NativeSelect.displayName = 'NativeSelect';


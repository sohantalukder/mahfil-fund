import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-neutral-200/80 via-neutral-100/60 to-neutral-200/80 bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  );
}


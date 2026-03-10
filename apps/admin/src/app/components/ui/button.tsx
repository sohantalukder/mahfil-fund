import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const baseClasses =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 gap-2';

const variantClasses: Record<Variant, string> = {
  default: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
  outline:
    'border border-border-subtle/80 bg-surface hover:bg-muted focus-visible:ring-border-subtle text-foreground',
  ghost: 'bg-transparent hover:bg-muted text-foreground',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  secondary:
    'bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-border-subtle',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9',
};

export function Button({
  className,
  variant = 'default',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}


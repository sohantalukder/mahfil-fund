'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './shared.module.css';
import { cn } from '@/lib/utils';

export type ActionItem = {
  label: string;
  icon?: ReactElement;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function ActionsMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const canUseDOM = typeof window !== 'undefined';

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const root = ref.current;
      const menu = menuRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const menuH = menu?.offsetHeight ?? 180;
      const menuW = menu?.offsetWidth ?? 170;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < menuH + gap
        ? Math.max(gap, rect.top - menuH - gap)
        : Math.min(window.innerHeight - menuH - gap, rect.bottom + gap);
      const left = Math.max(gap, Math.min(window.innerWidth - menuW - gap, rect.right - menuW));
      setMenuPos({ top, left });
    };
    const frame = window.requestAnimationFrame(updatePos);
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" className={styles.actionsBtn} onClick={() => setOpen((v) => !v)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="8" r="1.3" />
          <circle cx="8" cy="8" r="1.3" />
          <circle cx="12" cy="8" r="1.3" />
        </svg>
        Actions
      </button>

      {open && canUseDOM && createPortal(
        <div
          ref={menuRef}
          className="fixed overflow-hidden py-1 bg-card border border-border rounded-lg shadow-md min-w-[170px] z-[2000]"
          style={{
            // top/left are computed from getBoundingClientRect() at runtime — cannot be expressed as static Tailwind classes
            top: menuPos.top,
            left: menuPos.left,
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onClick(); }}
              className={cn(
                'flex items-center gap-[9px] w-full px-3.5 py-2 bg-transparent border-0 text-left text-[13px] font-medium transition-colors',
                item.disabled
                  ? 'cursor-not-allowed opacity-50 text-muted-foreground'
                  : item.danger
                  ? 'cursor-pointer text-destructive hover:bg-destructive/10'
                  : 'cursor-pointer text-foreground hover:bg-muted/60',
              )}
            >
              {item.icon && (
                <span className={cn('shrink-0', item.danger ? 'text-destructive' : 'text-muted-foreground')}>
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

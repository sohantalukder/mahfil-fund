'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from './ui/button';
import styles from './actions.module.css';
import shared from '@/components/shared/shared.module.css';

export type ActionItem = {
  label: string;
  icon: ReactElement;
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
        ref.current &&
        !ref.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const root = ref.current;
      const menu = menuRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const menuHeight = menu?.offsetHeight ?? 180;
      const menuWidth = menu?.offsetWidth ?? 170;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow < menuHeight + gap
          ? Math.max(gap, rect.top - menuHeight - gap)
          : Math.min(window.innerHeight - menuHeight - gap, rect.bottom + gap);
      const left = Math.max(gap, Math.min(window.innerWidth - menuWidth - gap, rect.right - menuWidth));

      setMenuPos({ top, left });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <div ref={ref} className={styles.triggerWrap}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={shared.actionsBtn}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="4" cy="8" r="1.3" />
          <circle cx="8" cy="8" r="1.3" />
          <circle cx="12" cy="8" r="1.3" />
        </svg>
        Actions
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={styles.iconMuted} aria-hidden>
          <path
            d="M2 3.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open &&
        canUseDOM &&
        createPortal(
          <div
            ref={menuRef}
            className={`animate-dropdown ${styles.menuPortal}`}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                disabled={item.disabled}
                className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                <span className={item.danger ? '' : styles.iconMuted}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div
      className={styles.confirmOverlay}
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className={styles.confirmCard}>
        <div className={styles.confirmHeader}>
          <div className={styles.dangerIconWrap} aria-hidden>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5L14.5 13H1.5L8 1.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path d="M8 6v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className={styles.confirmTitle}>{title}</div>
            {description ? <p className={styles.confirmDesc}>{description}</p> : null}
          </div>
        </div>
        <div className={styles.confirmActions}>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

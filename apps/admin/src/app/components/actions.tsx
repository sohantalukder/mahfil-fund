'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ── Actions dropdown ─────────────────────────────────────── */

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
      const top = spaceBelow < menuHeight + gap
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
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 6,
          border: '1px solid var(--db-card-bd)',
          background: 'var(--db-btn-bg)',
          color: 'var(--db-td)',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12" cy="8" r="1.3" />
        </svg>
        Actions
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: 0.5 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && canUseDOM && createPortal(
        <div
          ref={menuRef}
          className="animate-dropdown"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            background: 'var(--db-card-bg)',
            border: '1px solid var(--db-card-bd)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            minWidth: 170,
            zIndex: 2000,
            overflow: 'hidden',
            padding: '4px 0',
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onClick(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                width: '100%', padding: '8px 14px',
                background: 'none', border: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer',
                color: item.disabled ? 'var(--db-td)' : item.danger ? '#dc2626' : 'var(--db-td-em)',
                fontSize: 13, fontWeight: 500,
                opacity: item.disabled ? 0.4 : 1,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  (e.currentTarget as HTMLElement).style.background = item.danger
                    ? 'rgba(220,38,38,0.07)' : 'var(--db-btn-bg)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'none';
              }}
            >
              <span style={{ flexShrink: 0, color: item.disabled ? 'var(--db-td)' : item.danger ? '#dc2626' : 'var(--db-td)' }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ── Confirm delete modal ─────────────────────────────────── */

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
      className="db-overlay"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="db-modal" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="#dc2626" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M8 6v3.5M8 11v.5" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="db-modal-title" style={{ marginBottom: 4 }}>{title}</div>
            {description && (
              <p style={{ fontSize: 13, color: 'var(--db-td)', margin: 0 }}>{description}</p>
            )}
          </div>
        </div>
        <div className="db-form-actions">
          <button className="db-btn" type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: '#dc2626', color: '#fff',
              fontWeight: 600, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

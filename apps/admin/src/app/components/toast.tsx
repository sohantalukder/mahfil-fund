'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

type Toast = { id: number; type: ToastType; message: string };

type ToastCtx = { toast: (message: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, JSX.Element> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#059669" />
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#dc2626" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#2563eb" />
      <path d="M8 7v4M8 5.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }, 3500);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  const BG: Record<ToastType, string> = {
    success: 'var(--db-toast-success)',
    error: 'var(--db-toast-error)',
    info: 'var(--db-toast-info)',
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 10,
        background: BG[toast.type],
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        fontSize: 13, fontWeight: 500,
        color: 'var(--db-toast-text)',
        maxWidth: 340, width: '100%',
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(.4,0,.2,1), opacity 0.28s ease',
        cursor: 'default',
      }}
      onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
    >
      <span style={{ flexShrink: 0 }}>{ICONS[toast.type]}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

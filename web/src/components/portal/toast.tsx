'use client';

import {
  createContext,
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import styles from './toast.module.css';

export type ToastType = 'success' | 'error' | 'info';

type Toast = { id: number; type: ToastType; message: string };

type ToastCtx = { toast: (message: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, ReactElement> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" className={styles.iconSuccessCircle} />
      <path
        d="M4.5 8l2.5 2.5 4.5-4.5"
        stroke="var(--color-primary-fg)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" className={styles.iconErrorCircle} />
      <path
        d="M5.5 5.5l5 5M10.5 5.5l-5 5"
        stroke="var(--color-primary-fg)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" className={styles.iconInfoCircle} />
      <path
        d="M8 7v4M8 5.5v.5"
        stroke="var(--color-primary-fg)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3500);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  const typeClass =
    toast.type === 'success' ? styles.success : toast.type === 'error' ? styles.error : styles.info;

  return (
    <div
      className={`${styles.item} ${typeClass} ${visible ? styles.itemVisible : styles.itemHidden}`}
      onClick={() => {
        setVisible(false);
        setTimeout(() => onRemove(toast.id), 300);
      }}
      role="status"
    >
      <span className={styles.iconWrap}>{ICONS[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
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
      <div className={styles.anchor}>
        {toasts.map((t) => (
          <div key={t.id} className={styles.anchorItem}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

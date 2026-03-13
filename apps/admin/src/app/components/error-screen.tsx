import { Button } from './ui/button';

type ErrorScreenProps = {
  title?: string;
  message?: string;
  details?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorScreen({
  title = 'Something went wrong',
  message = 'We could not load this page right now.',
  details,
  actionLabel = 'Try Again',
  onAction,
}: ErrorScreenProps) {
  return (
    <div className="db-table-card" style={{ padding: 28, textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 999, background: '#fee2e2', color: '#dc2626', marginBottom: 12 }}>
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.8v3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.4" r=".8" fill="currentColor" />
        </svg>
      </div>
      <h3 style={{ margin: 0, fontSize: 18, color: 'var(--db-td-em)' }}>{title}</h3>
      <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--db-td)' }}>{message}</p>
      {details && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--db-td)' }}>
          {details}
        </p>
      )}
      {onAction && (
        <div style={{ marginTop: 16 }}>
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

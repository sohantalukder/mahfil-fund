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
    <div className="bg-card border border-border rounded-xl p-7 text-center">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-destructive/10 text-destructive mb-3">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.8v3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.4" r=".8" fill="currentColor" />
        </svg>
      </div>
      <h3 className="m-0 text-lg text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground m-0">{message}</p>
      {details && (
        <p className="mt-2 text-xs text-muted-foreground m-0">{details}</p>
      )}
      {onAction && (
        <div className="mt-4">
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

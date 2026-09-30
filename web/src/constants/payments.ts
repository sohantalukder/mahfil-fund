export const PAYMENT_METHODS = [
  { value: 'CASH',  label: 'Cash' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'BANK',  label: 'Bank' },
] as const;

export type PaymentMethodValue = typeof PAYMENT_METHODS[number]['value'];

export const STATUS_COLORS = {
  ACTIVE:    '#16A34A',
  INACTIVE:  '#9CA3AF',
  ARCHIVED:  '#9CA3AF',
  SUSPENDED: '#EF4444',
  PENDING:   '#D97706',
  USED:      '#16A34A',
  EXPIRED:   '#9CA3AF',
  CANCELLED: '#EF4444',
  DRAFT:     '#D97706',
  ISSUED:    '#16A34A',
} as const;

export const AVATAR_COLORS = [
  '#2563eb', '#7c3aed', '#059669',
  '#ea580c', '#db2777', '#0f766e',
] as const;

export function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

export function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const fmtBDT = (n: number): string =>
  `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;

export const DEFAULT_PAGE_SIZE = 25;

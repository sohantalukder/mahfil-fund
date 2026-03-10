export type UUID = string;

export type Locale = 'bn' | 'en';

export type ThemeMode = 'light' | 'dark' | 'system';

export type UserRole = 'super_admin' | 'admin' | 'collector' | 'viewer';

export type DonorType = 'individual' | 'family' | 'business' | 'organization';

export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'BANK';

export type SyncStatus = 'SYNCED' | 'PENDING' | 'SYNCING' | 'FAILED';

export interface ApiMeta {
  requestId?: string;
  serverTime: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | { success: true; data: T; meta: ApiMeta }
  | { success: false; error: ApiErrorShape; meta: ApiMeta };


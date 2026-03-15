/**
 * Mobile-only API types (no monorepo dependency).
 * Matches backend response shape used by getApi() / getAdminApi().
 */

export type UUID = string;

export interface ApiMeta {
  requestId?: string;
  serverTime: string;
  pagination?: {
    page: number;
    pageSize: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | { success: true; data: T; meta: ApiMeta }
  | { success: false; error: ApiErrorShape; meta: ApiMeta };

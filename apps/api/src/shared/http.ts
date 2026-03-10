import type { ApiErrorShape, ApiMeta, ApiResponse } from '@mahfil/types';

export function ok<T>(data: T, meta: ApiMeta): ApiResponse<T> {
  return { success: true, data, meta };
}

export function fail(meta: ApiMeta, error: ApiErrorShape): ApiResponse<never> {
  return { success: false, error, meta };
}


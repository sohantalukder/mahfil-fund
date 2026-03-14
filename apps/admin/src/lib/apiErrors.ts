import type { ApiErrorShape } from '@mahfil/types';
import axios from 'axios';

/** User-visible message from failed API / query calls. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: ApiErrorShape; message?: string } | undefined;
    if (data?.error?.message) return data.error.message;
    if (typeof data?.message === 'string') return data.message;
    if (err.message && !err.message.startsWith('Request failed')) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

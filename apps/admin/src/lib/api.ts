import { createApiClient } from '@mahfil/api-sdk';

export function getApi() {
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
    getAccessToken: async () => {
      const res = await fetch('/api/auth/access-token', { method: 'GET', cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken?: string };
      return data.accessToken ?? null;
    },
    onUnauthorizedRetry: async () => {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      return res.ok;
    },
    onAuthFailure: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    }
  });
}

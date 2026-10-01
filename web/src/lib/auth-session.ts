import axios from 'axios';
import type { ApiResponse } from '@/types/contracts';
import type { paths } from '@/types/generated-api';

const baseURL = '/backend';
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
const authFailureListeners = new Set<() => void>();

type TokenPayload = { accessToken: string };
type LoginRequest = paths['/auth/login']['post']['requestBody']['content']['application/json'];
type FirstLoginRequest = paths['/auth/complete-first-login']['post']['requestBody']['content']['application/json'];
export type LoginPayload = TokenPayload & { requiresPasswordChange: false } | {
  requiresPasswordChange: true;
  challengeToken: string;
};

function csrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const part = document.cookie.split('; ').find((value) => value.startsWith('mf_csrf='));
  return part ? decodeURIComponent(part.slice('mf_csrf='.length)) : null;
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function subscribeAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener);
  return () => authFailureListeners.delete(listener);
}

export function clearAccessToken() {
  accessToken = null;
  for (const listener of authFailureListeners) listener();
}

export async function login(email: string, password: string): Promise<LoginPayload> {
  const body: LoginRequest = { email, password };
  const { data } = await axios.post<ApiResponse<LoginPayload>>(`${baseURL}/auth/login`, body, {
    withCredentials: true, headers: { 'X-Client': 'web' },
  });
  if (!data.success) throw new Error(data.error.message);
  if (!data.data.requiresPasswordChange) accessToken = data.data.accessToken;
  return data.data;
}

export async function completeFirstLogin(challengeToken: string, newPassword: string): Promise<void> {
  const body: FirstLoginRequest = { challengeToken, newPassword };
  const { data } = await axios.post<ApiResponse<TokenPayload>>(`${baseURL}/auth/complete-first-login`, body, { withCredentials: true, headers: { 'X-Client': 'web' } });
  if (!data.success) throw new Error(data.error.message);
  accessToken = data.data.accessToken;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { data } = await axios.post<ApiResponse<{ message: string }>>(`${baseURL}/auth/forgot-password`, { email }, {
    headers: { 'X-Client': 'web' },
  });
  if (!data.success) throw new Error(data.error.message);
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const { data } = await axios.post<ApiResponse<{ message: string }>>(`${baseURL}/auth/reset-password`, {
    email, code, newPassword,
  }, { headers: { 'X-Client': 'web' } });
  if (!data.success) throw new Error(data.error.message);
}

export async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const csrf = csrfToken();
      if (!csrf) {
        clearAccessToken();
        return false;
      }
      const { data } = await axios.post<ApiResponse<TokenPayload>>(`${baseURL}/auth/refresh`, {}, {
        withCredentials: true, headers: { 'X-Client': 'web', 'X-CSRF-Token': csrf },
      });
      if (!data.success) return false;
      accessToken = data.data.accessToken;
      return true;
    } catch {
      clearAccessToken();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function logout(): Promise<void> {
  const csrf = csrfToken();
  clearAccessToken();
  if (csrf) {
    void axios.post(`${baseURL}/auth/logout`, {}, {
      withCredentials: true, headers: { 'X-Client': 'web', 'X-CSRF-Token': csrf },
    }).catch(() => undefined);
  }
}

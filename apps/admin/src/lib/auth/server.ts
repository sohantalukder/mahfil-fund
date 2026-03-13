import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './constants';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error?: { message?: string } };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export async function callApi<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) return { ok: false, status: 500, message: 'Missing NEXT_PUBLIC_API_URL' };
  const normalizedBaseUrl = baseUrl.replace('://localhost', '://127.0.0.1');

  const response = await fetch(`${normalizedBaseUrl.replace(/\/+$/, '')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  let payload: ApiResult<T> | null = null;
  try {
    payload = (await response.json()) as ApiResult<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || !payload.success) {
    return {
      ok: false,
      status: response.status,
      message: payload && !payload.success ? payload.error?.message ?? 'Request failed' : 'Request failed'
    };
  }

  return { ok: true, data: payload.data };
}

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();
  const common = { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...common,
    httpOnly: true,
    maxAge: ACCESS_TTL_SECONDS
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...common,
    httpOnly: true,
    maxAge: REFRESH_TTL_SECONDS
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getTokensFromCookies(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null
  };
}


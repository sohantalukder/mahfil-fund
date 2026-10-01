import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import { getApiBaseUrl } from '@/config/env';
import type { ApiResponse } from '@/types/api';
import type { paths } from '@/types/generated-api';

const SERVICE = 'com.mahfilfund.auth';

export type TokenPair = { accessToken: string; refreshToken: string };
export type ApiUser = {
  id: string;
  email: string;
  fullName?: string | null;
  isSuperAdmin: boolean;
};
export type AppSession = { accessToken: string; user: ApiUser };
export type SignInResult =
  | { requiresPasswordChange: true; challengeToken: string }
  | { requiresPasswordChange: false };
type LoginRequest = paths['/auth/login']['post']['requestBody']['content']['application/json'];
type FirstLoginRequest = paths['/auth/complete-first-login']['post']['requestBody']['content']['application/json'];

type SessionListener = (session: AppSession | null) => void;

let tokens: TokenPair | null = null;
let activeSession: AppSession | null = null;
let refreshPromise: Promise<AppSession | null> | null = null;
const listeners = new Set<SessionListener>();

function publish(session: AppSession | null) {
  activeSession = session;
  for (const listener of listeners) listener(session);
}

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  listener(activeSession);
  return () => listeners.delete(listener);
}

async function persist(next: TokenPair | null) {
  tokens = next;
  if (!next) {
    await Keychain.resetGenericPassword({ service: SERVICE });
    return;
  }
  await Keychain.setGenericPassword('mahfil-session', JSON.stringify(next), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function restoreTokens(): Promise<TokenPair | null> {
  if (tokens) return tokens;
  const stored = await Keychain.getGenericPassword({ service: SERVICE });
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored.password) as Partial<TokenPair>;
    if (typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string') throw new Error('Invalid session');
    tokens = parsed as TokenPair;
    return tokens;
  } catch {
    await persist(null);
    return null;
  }
}

async function profile(accessToken: string): Promise<ApiUser> {
  const { data } = await axios.get<ApiResponse<{ user: ApiUser }>>(`${getApiBaseUrl()}/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'X-Client': 'mobile' },
  });
  if (!data.success) throw new Error(data.error.message);
  return data.data.user;
}

async function establish(next: TokenPair, user?: ApiUser): Promise<AppSession> {
  await persist(next);
  const session = { accessToken: next.accessToken, user: user ?? await profile(next.accessToken) };
  publish(session);
  return session;
}

export async function signIn(email: string, password: string): Promise<{ result: SignInResult; session: AppSession | null }> {
  const body: LoginRequest = { email, password };
  const { data } = await axios.post<ApiResponse<({ requiresPasswordChange: true; challengeToken: string } | ({ requiresPasswordChange: false; user: ApiUser } & TokenPair))>>(
    `${getApiBaseUrl()}/auth/login`, body, { headers: { 'X-Client': 'mobile' } },
  );
  if (!data.success) throw new Error(data.error.message);
  if (data.data.requiresPasswordChange) return { result: data.data, session: null };
  const session = await establish(
    { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken },
    data.data.user,
  );
  return { result: { requiresPasswordChange: false }, session };
}

export async function completeFirstLogin(challengeToken: string, newPassword: string): Promise<AppSession> {
  const body: FirstLoginRequest = { challengeToken, newPassword };
  const { data } = await axios.post<ApiResponse<TokenPair>>(`${getApiBaseUrl()}/auth/complete-first-login`, body, { headers: { 'X-Client': 'mobile' } });
  if (!data.success) throw new Error(data.error.message);
  return establish(data.data);
}

export async function refreshSession(): Promise<AppSession | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = await restoreTokens();
    if (!current) return null;
    try {
      const { data } = await axios.post<ApiResponse<TokenPair>>(`${getApiBaseUrl()}/auth/refresh`, {
        refreshToken: current.refreshToken,
      }, { headers: { 'X-Client': 'mobile' } });
      if (!data.success) throw new Error(data.error.message);
      return await establish(data.data);
    } catch {
      await clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function restoreSession(): Promise<AppSession | null> {
  const current = await restoreTokens();
  if (!current) {
    publish(null);
    return null;
  }
  try {
    const session = { accessToken: current.accessToken, user: await profile(current.accessToken) };
    publish(session);
    return session;
  } catch {
    return refreshSession();
  }
}

export async function reloadSessionProfile(): Promise<AppSession | null> {
  const current = await restoreTokens();
  if (!current) return null;
  try {
    const session = { accessToken: current.accessToken, user: await profile(current.accessToken) };
    publish(session);
    return session;
  } catch {
    return refreshSession();
  }
}

export async function adoptTokenPair(next: TokenPair): Promise<AppSession> {
  return establish(next);
}

export async function getAccessToken(): Promise<string | null> {
  return (await restoreTokens())?.accessToken ?? null;
}

export async function clearSession(): Promise<void> {
  await persist(null);
  publish(null);
}

export async function logout(): Promise<void> {
  const current = await restoreTokens();
  await clearSession();
  if (current) {
    void axios.post(`${getApiBaseUrl()}/auth/logout`, { refreshToken: current.refreshToken }, {
      headers: { 'X-Client': 'mobile' },
    }).catch(() => undefined);
  }
}

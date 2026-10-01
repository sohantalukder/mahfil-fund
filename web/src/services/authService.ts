import type { ApiClient } from '@/lib/api-client';
import { setAccessToken } from '@/lib/auth-session';

export type UserProfile = {
  id: string;
  email: string;
  fullName?: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
};

export async function getProfile(api: ApiClient): Promise<UserProfile> {
  const res = await api.get<{ user?: UserProfile } | UserProfile>('/me');
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as { user?: UserProfile } | UserProfile;
  return (d as { user?: UserProfile }).user ?? (d as UserProfile);
}

export async function updateProfile(
  api: ApiClient,
  fullName: string
): Promise<void> {
  const res = await api.patch('/me/profile', { fullName });
  if (!res.success) throw new Error(res.error.message);
}

export async function changePassword(
  api: ApiClient,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await api.patch<{ accessToken: string }>('/me/password', { currentPassword, newPassword });
  if (!res.success) throw new Error(res.error.message);
  setAccessToken(res.data.accessToken);
}

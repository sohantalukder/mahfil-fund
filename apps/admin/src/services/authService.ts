import type { ApiClient } from '@mahfil/api-sdk';

export type UserProfile = {
  id: string;
  email: string;
  fullName?: string | null;
  roles: string[];
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
  const res = await api.patch('/me/password', { currentPassword, newPassword });
  if (!res.success) throw new Error(res.error.message);
}

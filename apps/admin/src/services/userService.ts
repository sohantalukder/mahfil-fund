import type { ApiClient } from '@mahfil/api-sdk';
import type { AppUser, UserListResponse } from '@/types';
import type { RoleName } from '@/constants/roles';

export type UserListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateUserInput = {
  email: string;
  password: string;
  fullName?: string | null;
  roles: RoleName[];
};

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export async function listUsers(
  api: ApiClient,
  params: UserListParams = {}
): Promise<UserListResponse> {
  const qs = buildParams({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
    search: params.search,
  });
  const res = await api.get<UserListResponse>(`/users?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as UserListResponse | AppUser[];
  if (Array.isArray(d)) {
    return { users: d, total: d.length, totalPages: 1, page: 1 };
  }
  return {
    users: d.users ?? [],
    total: d.total ?? 0,
    totalPages: Math.max(1, d.totalPages ?? 1),
    page: d.page ?? 1,
  };
}

export async function getMe(api: ApiClient): Promise<{ id: string; roles: string[] }> {
  const res = await api.get<{ user?: { id: string; roles: string[] } } | { id: string; roles: string[] }>('/me');
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as { user?: { id: string; roles: string[] } } | { id: string; roles: string[] };
  return (d as { user?: { id: string; roles: string[] } }).user ?? (d as { id: string; roles: string[] });
}

export async function createUser(
  api: ApiClient,
  input: CreateUserInput
): Promise<AppUser> {
  const res = await api.post<{ user: AppUser } | AppUser>('/users', input);
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as { user?: AppUser } | AppUser;
  return (d as { user?: AppUser }).user ?? (d as AppUser);
}

export async function updateUserRoles(
  api: ApiClient,
  userId: string,
  roles: RoleName[]
): Promise<void> {
  const res = await api.patch(`/users/${userId}/roles`, { roles });
  if (!res.success) throw new Error(res.error.message);
}

export async function toggleUserStatus(
  api: ApiClient,
  userId: string,
  isActive: boolean
): Promise<void> {
  const res = await api.patch(`/users/${userId}/status`, { isActive });
  if (!res.success) throw new Error(res.error.message);
}

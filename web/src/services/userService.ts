import type { ApiClient } from '@/lib/api-client';
import type { AppUser, UserListResponse } from '@/types';
import type { RoleName } from '@/constants/roles';

export type UserListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateUserInput = {
  kind: 'new' | 'existing';
  email: string;
  password?: string;
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
  const res = await api.get<{ members: Array<{
    role: string; status: string; joinedAt: string;
    user: AppUser & { mustChangePassword?: boolean };
  }>; total: number; totalPages: number; page: number }>(`/members?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  const d = res.data;
  return {
    users: (d.members ?? []).map((member) => ({
      ...member.user,
      roles: [member.role],
      isActive: member.status === 'ACTIVE' && member.user.isActive,
      createdAt: member.joinedAt,
    })),
    total: d.total ?? 0,
    totalPages: Math.max(1, d.totalPages ?? 1),
    page: d.page ?? 1,
  };
}

export async function getMe(api: ApiClient): Promise<{ id: string }> {
  const res = await api.get<{ user?: { id: string } } | { id: string }>('/me');
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as { user?: { id: string } } | { id: string };
  return (d as { user?: { id: string } }).user ?? (d as { id: string });
}

export async function createUser(
  api: ApiClient,
  input: CreateUserInput
): Promise<AppUser> {
  const role = input.roles[0] ?? 'viewer';
  const body = input.kind === 'new'
    ? { kind: 'new' as const, email: input.email, fullName: input.fullName, temporaryPassword: input.password, role }
    : { kind: 'existing' as const, email: input.email, role };
  const res = await api.post<{ member: { user: AppUser } }>('/members', body);
  if (!res.success) throw new Error(res.error.message);
  return res.data.member.user;
}

export async function updateUserRoles(
  api: ApiClient,
  userId: string,
  roles: RoleName[]
): Promise<void> {
  const role = roles[0] ?? 'viewer';
  const res = await api.patch(`/members/${userId}`, { role });
  if (!res.success) throw new Error(res.error.message);
}

export async function toggleUserStatus(
  api: ApiClient,
  userId: string,
  isActive: boolean
): Promise<void> {
  const res = await api.patch(`/members/${userId}`, { status: isActive ? 'ACTIVE' : 'SUSPENDED' });
  if (!res.success) throw new Error(res.error.message);
}

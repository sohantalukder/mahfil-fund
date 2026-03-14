import type { ApiClient } from '@mahfil/api-sdk';
import type { Community, CommunityCreationStats } from '@mahfil/types';

export type CommunityWithCounts = Community & {
  _count: { memberships: number; events: number };
};

export type CommunityListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CommunityListResponse = {
  communities: CommunityWithCounts[];
  total: number;
  page: number;
  totalPages: number;
};

export type CreateCommunityInput = {
  name: string;
  slug: string;
  description?: string;
  location?: string;
  district?: string;
  thana?: string;
  contactNumber?: string;
  email?: string;
};

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export async function listCommunities(
  api: ApiClient,
  params: CommunityListParams = {}
): Promise<CommunityListResponse> {
  const qs = buildParams({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    search: params.search,
  });
  const res = await api.get<CommunityListResponse>(`/communities?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  return res.data;
}

export async function getCreationStats(api: ApiClient): Promise<{ stats: CommunityCreationStats }> {
  const res = await api.get<{ stats: CommunityCreationStats }>('/communities/creation-stats');
  if (!res.success) throw new Error(res.error.message);
  return res.data;
}

export async function createCommunity(
  api: ApiClient,
  payload: CreateCommunityInput
): Promise<{ community: { id: string } }> {
  const body = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined && v !== '')
  );
  const res = await api.post<{ community: { id: string } }>('/communities', body);
  if (!res.success) throw new Error(res.error.message);
  return res.data;
}

export async function archiveCommunity(api: ApiClient, id: string): Promise<void> {
  const res = await api.delete(`/communities/${id}`);
  if (!res.success) throw new Error(res.error.message);
}

import type { ApiClient } from '@mahfil/api-sdk';
import type { CommunityInvitation } from '@mahfil/types';

export type InvitationListParams = {
  communityId: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type InvitationListResponse = {
  invitations: CommunityInvitation[];
  total: number;
  page: number;
  totalPages: number;
};

export type CreateInvitationInput = {
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: string;
  note?: string;
  expiresInDays: number;
};

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export async function listInvitations(
  api: ApiClient,
  params: InvitationListParams
): Promise<InvitationListResponse> {
  const qs = buildParams({ status: params.status, page: params.page, pageSize: params.pageSize });
  const res = await api.get<InvitationListResponse>(
    `/communities/${params.communityId}/invitations?${qs}`
  );
  if (!res.success) throw new Error(res.error.message);
  return res.data;
}

export async function createInvitation(
  api: ApiClient,
  communityId: string,
  input: CreateInvitationInput
): Promise<{ invitation: CommunityInvitation }> {
  const res = await api.post<{ invitation: CommunityInvitation }>(
    `/communities/${communityId}/invitations`,
    input
  );
  if (!res.success) throw new Error(res.error.message);
  return res.data;
}

export async function cancelInvitation(api: ApiClient, invitationId: string): Promise<void> {
  const res = await api.post(`/invitations/${invitationId}/cancel`, {});
  if (!res.success) throw new Error(res.error.message);
}

export async function resendInvitation(
  api: ApiClient,
  invitationId: string
): Promise<{ invitation: { inviteCode: string } }> {
  const res = await api.post<{ invitation: { inviteCode: string } }>(
    `/invitations/${invitationId}/resend`,
    {}
  );
  if (!res.success) throw new Error(res.error.message);
  return res.data;
}

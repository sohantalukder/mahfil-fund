import type { ApiClient } from '@mahfil/api-sdk';
import type { Donation, DonationListResponse } from '@/types';

export type DonationListParams = {
  eventId?: string;
  donorId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  limit?: number;
};

export type CreateDonationInput = {
  eventId: string;
  donorId: string;
  amount: number;
  paymentMethod: string;
  donationDate: Date;
  note?: string | null;
};

export type UpdateDonationInput = Partial<Omit<CreateDonationInput, 'eventId' | 'donorId'>>;

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

function normalizeDonationList(data: unknown): DonationListResponse {
  if (Array.isArray(data)) {
    return { donations: data as Donation[], total: (data as Donation[]).length, totalPages: 1, page: 1 };
  }
  const d = data as { donations?: Donation[]; total?: number; totalPages?: number; page?: number };
  return {
    donations: d.donations ?? [],
    total: d.total ?? 0,
    totalPages: Math.max(1, d.totalPages ?? 1),
    page: d.page ?? 1,
  };
}

export async function listDonations(
  api: ApiClient,
  params: DonationListParams = {}
): Promise<DonationListResponse> {
  const qs = buildParams({
    eventId: params.eventId,
    donorId: params.donorId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
    search: params.search,
    limit: params.limit,
  });
  const res = await api.get(`/donations?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  return normalizeDonationList(res.data);
}

export async function createDonation(
  api: ApiClient,
  input: CreateDonationInput
): Promise<Donation> {
  const res = await api.post<Donation>('/donations', input);
  if (!res.success) throw new Error(res.error.message);
  return res.data as Donation;
}

export async function updateDonation(
  api: ApiClient,
  id: string,
  input: UpdateDonationInput
): Promise<Donation> {
  const res = await api.patch<Donation>(`/donations/${id}`, input);
  if (!res.success) throw new Error(res.error.message);
  return res.data as Donation;
}

export async function deleteDonation(api: ApiClient, id: string): Promise<void> {
  const res = await api.delete(`/donations/${id}`);
  if (!res.success) throw new Error(res.error.message);
}

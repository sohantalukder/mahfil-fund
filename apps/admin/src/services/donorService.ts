import type { ApiClient } from '@mahfil/api-sdk';
import type { Donor, DonorListResponse, Donation } from '@/types';

export type DonorListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CreateDonorInput = {
  fullName: string;
  phone: string;
  altPhone?: string | null;
  address?: string | null;
  donorType: string;
  note?: string | null;
  preferredLanguage?: string;
  tags?: string[];
};

export type UpdateDonorInput = Partial<CreateDonorInput>;

function buildParams(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

function normalizeDonorList(data: unknown): DonorListResponse {
  if (Array.isArray(data)) {
    return { donors: data as Donor[], total: (data as Donor[]).length, totalPages: 1, page: 1 };
  }
  const d = data as { donors?: Donor[]; total?: number; totalPages?: number; page?: number };
  return {
    donors: d.donors ?? [],
    total: d.total ?? 0,
    totalPages: Math.max(1, d.totalPages ?? 1),
    page: d.page ?? 1,
  };
}

export async function listDonors(
  api: ApiClient,
  params: DonorListParams = {}
): Promise<DonorListResponse> {
  const qs = buildParams({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
    search: params.search,
  });
  const res = await api.get(`/donors?${qs}`);
  if (!res.success) throw new Error(res.error.message);
  return normalizeDonorList(res.data);
}

export async function listAllDonors(api: ApiClient): Promise<Donor[]> {
  const res = await api.get('/donors?page=1&pageSize=100');
  if (!res.success) throw new Error(res.error.message);
  return normalizeDonorList(res.data).donors;
}

export async function createDonor(api: ApiClient, input: CreateDonorInput): Promise<Donor> {
  const res = await api.post<{ donor?: Donor } | Donor>('/donors', {
    ...input,
    preferredLanguage: input.preferredLanguage ?? 'en',
    tags: input.tags ?? [],
  });
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as { donor?: Donor } | Donor;
  return (d as { donor?: Donor }).donor ?? (d as Donor);
}

export async function updateDonor(
  api: ApiClient,
  id: string,
  input: UpdateDonorInput
): Promise<Donor> {
  const res = await api.patch<Donor>(`/donors/${id}`, input);
  if (!res.success) throw new Error(res.error.message);
  return res.data as Donor;
}

export async function deleteDonor(api: ApiClient, id: string): Promise<void> {
  const res = await api.delete(`/donors/${id}`);
  if (!res.success) throw new Error(res.error.message);
}

export async function getDonorDonations(
  api: ApiClient,
  donorId: string
): Promise<Donation[]> {
  const res = await api.get<{ donations?: Donation[] } | Donation[]>(
    `/donations?donorId=${encodeURIComponent(donorId)}`,
  );
  if (!res.success) throw new Error(res.error.message);
  const d = res.data as { donations?: Donation[] } | Donation[];
  return Array.isArray(d) ? d : (d.donations ?? []);
}

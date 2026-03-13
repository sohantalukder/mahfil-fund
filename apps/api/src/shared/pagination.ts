export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

export function paginationOk<T>(
  data: T,
  page: number,
  pageSize: number,
  total: number,
  serverTime: string,
  requestId: string
) {
  const meta = buildPaginationMeta(page, pageSize, total);
  return {
    success: true as const,
    data,
    meta: { serverTime, requestId, pagination: meta }
  };
}

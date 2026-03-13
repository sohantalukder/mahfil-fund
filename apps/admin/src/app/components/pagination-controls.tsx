'use client';

import { Button } from './ui/button';

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  loading?: boolean;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  loading = false,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const hasPrev = safePage > 1;
  const hasNext = safePage < safeTotalPages;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        marginTop: 14
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="db-page-subtitle" style={{ margin: 0 }}>
          {loading ? 'Loading…' : `${total} total`}
        </span>
        <select
          className="db-input"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ minWidth: 100, maxWidth: 120 }}
          disabled={loading}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} / page
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button type="button" variant="outline" disabled={!hasPrev || loading} onClick={() => onPageChange(safePage - 1)}>
          Prev
        </Button>
        <span className="db-page-subtitle" style={{ margin: 0, minWidth: 110, textAlign: 'center' }}>
          Page {safePage} of {safeTotalPages}
        </span>
        <Button type="button" variant="outline" disabled={!hasNext || loading} onClick={() => onPageChange(safePage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

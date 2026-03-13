'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from './ui/pagination';

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

function buildPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, 'ellipsis', total);
  } else if (current >= total - 3) {
    pages.push(1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total);
  }

  return pages;
}

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

  const pageRange = buildPageRange(safePage, safeTotalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-3.5">
      <div className="flex items-center gap-2">
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

      <Pagination className="w-auto mx-0">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(safePage - 1)}
              disabled={!hasPrev || loading}
            />
          </PaginationItem>

          {pageRange.map((item, index) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  isActive={item === safePage}
                  disabled={loading}
                  onClick={() => item !== safePage && onPageChange(item)}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(safePage + 1)}
              disabled={!hasNext || loading}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

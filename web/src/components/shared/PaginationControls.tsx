'use client';

import { useTranslation } from 'react-i18next';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import styles from './shared.module.css';
import { cn } from '@/lib/utils';

type PaginationControlsProps = {
  page: number;
  pageSize?: number;
  total: number;
  totalPages: number;
  loading?: boolean;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

function buildPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
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
  pageSize = 25,
  total,
  totalPages,
  loading = false,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const { t } = useTranslation();
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const pageRange = buildPageRange(safePage, safeTotalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {loading ? t('admin.ui.loading') : t('admin.ui.totalCount', { n: total })}
        </span>
        {onPageSizeChange && (
          <select
            className={cn(styles.nativeSelect, 'min-w-[100px]')}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={loading}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{t('admin.ui.perPage', { n: opt })}</option>
            ))}
          </select>
        )}
      </div>

      <Pagination className="w-auto mx-0">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text={t('admin.ui.previous')}
              onClick={() => { if (safePage > 1 && !loading) onPageChange(safePage - 1); }}
              aria-disabled={safePage <= 1 || loading}
              className={cn(safePage <= 1 || loading ? 'pointer-events-none opacity-40' : '')}
            />
          </PaginationItem>
          {pageRange.map((item, index) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`e-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  isActive={item === safePage}
                  onClick={() => { if (!loading && item !== safePage) onPageChange(item); }}
                  className={cn(loading ? 'pointer-events-none opacity-40' : '')}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              text={t('admin.ui.next')}
              onClick={() => { if (safePage < safeTotalPages && !loading) onPageChange(safePage + 1); }}
              aria-disabled={safePage >= safeTotalPages || loading}
              className={cn(safePage >= safeTotalPages || loading ? 'pointer-events-none opacity-40' : '')}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

'use client';

/** Thanh phân trang (preview tasks-list `.pager`): "a–b / n" · ‹ 1 … 4 5 6 … 20 › · Mỗi trang [20]. */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/i18n/format';
import { resolveLocale } from '@/i18n/locale';
import { pageCount, pageRange, pageWindow, PAGE_SIZES } from './page-range';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizes?: readonly number[];
  className?: string;
}

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const navBtn = cn('grid size-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40', ring);

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = PAGE_SIZES, className }: PaginationProps) {
  const t = useTranslations();
  const locale = resolveLocale(useLocale());
  if (total <= 0) return null;
  const pages = pageCount(total, pageSize);
  const w = pageWindow(page, pageSize, total);
  return (
    <nav aria-label={t('tl.pg.nav')} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-0.5 pt-3 text-[13px] text-ink-2', className)}>
      <span className="font-mono text-xs text-ink-3">
        {formatNumber(w.from, locale)}–{formatNumber(w.to, locale)} / {formatNumber(w.total, locale)}
      </span>
      <span className="ml-auto flex items-center gap-0.5 max-[680px]:order-3 max-[680px]:ml-0 max-[680px]:w-full max-[680px]:justify-center">
        <button type="button" className={navBtn} aria-label={t('tl.pg.prev')} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        {pageRange(page, pages).map((x, i) =>
          x === '…' ? (
            <span key={`gap${i}`} aria-hidden className="min-w-5 text-center text-ink-3">…</span>
          ) : (
            <button
              key={x}
              type="button"
              aria-label={t('tl.pg.page', { n: x })}
              aria-current={x === page ? 'page' : undefined}
              onClick={() => onPageChange(x)}
              className={cn(
                'h-8 min-w-8 rounded-md border border-transparent px-1.5 font-mono text-xs text-ink-2 hover:bg-surface-2',
                ring,
                x === page && 'border-line-2 bg-surface font-semibold text-ink',
              )}
            >
              {x}
            </button>
          ),
        )}
        <button type="button" className={navBtn} aria-label={t('tl.pg.next')} disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </span>
      {onPageSizeChange && (
        <label className="flex items-center gap-2 max-[680px]:ml-auto">
          <span>{t('tl.pg.size')}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cn('h-8 w-[76px] rounded-md border border-line-2 bg-surface px-2 text-[13px] text-ink', ring)}
          >
            {pageSizes.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
}

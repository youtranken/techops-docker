'use client';

/**
 * Bảng dữ liệu V2 (preview `.tbl .thead .th .tr .td`): lưới CSS theo định nghĩa cột.
 * - `hideBelow`: ẩn cột khi màn ≤1100 ('lg') hoặc ≤900 ('md') — cột bị bỏ khỏi lưới, không chỉ ẩn ô.
 * - ≤680: mỗi dòng thành khối 2–3 tầng (flex-wrap). `mobile`: 'main' chiếm cả hàng, 'end' dồn phải,
 *   'hide' ẩn; `mobileOrder` sắp thứ tự. CSS ở globals.css (khối "DataTable").
 * - Trạng thái: loading (skeleton đúng số cột) / error (ErrorState + Thử lại) / empty (EmptyState).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, Skeleton, type EmptyStateProps } from './States';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Bề rộng track lưới, mặc định `minmax(0,1fr)` */
  width?: string;
  hideBelow?: 'md' | 'lg';
  mobile?: 'main' | 'end' | 'hide';
  mobileOrder?: number;
  align?: 'start' | 'end';
  /** Thuộc tính thêm cho ô tiêu đề (vd aria-sort + nút sắp xếp nằm trong header) */
  headerProps?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
}

export interface DataTableProps<T> {
  ariaLabel: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  error?: React.ReactNode;
  onRetry?: () => void;
  empty?: EmptyStateProps;
  onRowClick?: (row: T) => void;
  /** id dòng đang chọn (viền trái màu chính) */
  selectedId?: string;
  /** Lớp thêm cho từng dòng (vd tô dòng cần chú ý) */
  rowClassName?: (row: T) => string | false | null | undefined;
  className?: string;
  'data-testid'?: string;
}

const track = (c: { width?: string }) => c.width ?? 'minmax(0,1fr)';

export function gridTemplates<T>(columns: DataTableColumn<T>[]) {
  return {
    xl: columns.map(track).join(' '),
    lg: columns.filter((c) => c.hideBelow !== 'lg').map(track).join(' '),
    md: columns.filter((c) => !c.hideBelow).map(track).join(' '),
  };
}

function cellAttrs<T>(c: DataTableColumn<T>) {
  return {
    'data-hide': c.hideBelow,
    'data-m': c.mobile,
    style: c.mobileOrder !== undefined ? ({ '--m-order': c.mobileOrder } as React.CSSProperties) : undefined,
  };
}

function FullRow({ children }: { children: React.ReactNode }) {
  return <div role="row"><div role="cell">{children}</div></div>;
}

export function DataTable<T>({
  ariaLabel, columns, rows, getRowId, loading = false, skeletonRows = 6, error, onRetry, empty, onRowClick, selectedId, rowClassName, className,
  'data-testid': testId,
}: DataTableProps<T>) {
  const g = gridTemplates(columns);
  const style = { '--cols-xl': g.xl, '--cols-lg': g.lg, '--cols-md': g.md } as React.CSSProperties;
  const hasError = error !== undefined && error !== null && error !== false;

  let body: React.ReactNode;
  if (hasError) {
    body = <FullRow><ErrorState description={error} onRetry={onRetry} /></FullRow>;
  } else if (loading) {
    body = Array.from({ length: skeletonRows }, (_, i) => (
      <div key={i} role="row" className="v2-tr" data-skeleton-row>
        {columns.map((c, ci) => (
          <div key={c.key} role="cell" className="v2-td" {...cellAttrs(c)}>
            <Skeleton variant="line" style={{ width: ci === 1 || c.mobile === 'main' ? '70%' : '60%' }} />
          </div>
        ))}
      </div>
    ));
  } else if (rows.length === 0) {
    body = <FullRow><EmptyState {...empty} /></FullRow>;
  } else {
    body = rows.map((row) => {
      const id = getRowId(row);
      return (
        <div
          key={id}
          role="row"
          className={cn('v2-tr', selectedId === id && 'is-sel', rowClassName?.(row))}
          tabIndex={onRowClick ? 0 : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onKeyDown={
            onRowClick
              ? (e) => {
                  if (e.target !== e.currentTarget) return; // phím từ nút/ô con
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); }
                }
              : undefined
          }
          aria-selected={selectedId !== undefined ? selectedId === id : undefined}
        >
          {columns.map((c) => (
            <div key={c.key} role="cell" className={cn('v2-td', c.align === 'end' && 'justify-end', c.className)} {...cellAttrs(c)}>
              {c.cell(row)}
            </div>
          ))}
        </div>
      );
    });
  }

  return (
    <div role="table" aria-label={ariaLabel} aria-busy={loading || undefined} className={cn('v2-tbl', className)} style={style} data-testid={testId}>
      <div role="rowgroup">
        <div role="row" className="v2-thead">
          {columns.map((c) => (
            <div key={c.key} role="columnheader" className={cn('v2-th', c.align === 'end' && 'justify-end')} data-hide={c.hideBelow} {...c.headerProps}>
              {c.header}
            </div>
          ))}
        </div>
      </div>
      <div role="rowgroup">{body}</div>
    </div>
  );
}

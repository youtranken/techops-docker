'use client';

/**
 * Bảng ticket (preview helpdesk `.tbl`): Ticket (tiêu đề + mã) · Người yêu cầu · Trạng thái Helpdesk · Người xử lý · Ngày tạo · ›.
 * Bấm dòng = mở ngăn chi tiết. Ô chọn chỉ cho Boss/Admin và chỉ ticket chưa tạo việc (V1).
 * ≤680: dòng 2 tầng (tiêu đề | người yêu cầu · trạng thái · ngày).
 */
import * as React from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Inbox, SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import type { HelpdeskPendingItem } from '../../types';
import { headerCheck, rowFlags } from './hd-logic';
import { HdFlag, HdStatus } from './HdCells';

export interface HdTableProps {
  rows: HelpdeskPendingItem[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  filtered: boolean;
  canManage: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (on: boolean) => void;
  openId: string | null;
  onOpen: (row: HelpdeskPendingItem) => void;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();
const ckBox = 'grid size-7 flex-none place-items-center rounded-md -ml-2 mr-1 cursor-pointer hover:bg-surface-2 max-[680px]:size-9';
const ckInput = 'size-4 cursor-pointer accent-[var(--primary)]';

function HeaderCheck({ state, onChange, label }: { state: ReturnType<typeof headerCheck>; onChange: (on: boolean) => void; label: string }) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = state === 'some'; }, [state]);
  return (
    <label className={ckBox}>
      <input ref={ref} type="checkbox" className={ckInput} aria-label={label} checked={state === 'all'} disabled={state === 'disabled'}
        onChange={(e) => onChange(e.target.checked)} data-testid="hd-check-all" />
    </label>
  );
}

export function HdTable(p: HdTableProps) {
  const t = useTranslations();
  const f = useFormat();

  const columns: DataTableColumn<HelpdeskPendingItem>[] = [
    {
      key: 'tk',
      mobile: 'main',
      header: (
        <span className="flex items-center">
          {p.canManage && <HeaderCheck state={headerCheck(p.selected, p.rows)} onChange={p.onToggleAll} label={t('hd.selPage')} />}
          {t('hd.col.ticket')}
        </span>
      ),
      cell: (r) => {
        const fl = rowFlags(r);
        return (
          <span className="flex min-w-0 flex-1 items-start max-[680px]:items-start">
            {p.canManage && (fl.selectable ? (
              <label className={ckBox} onClick={stop} onKeyDown={stop}>
                <input type="checkbox" className={ckInput} checked={p.selected.has(r.id)} onChange={() => p.onToggle(r.id)}
                  aria-label={t('hd.selOne', { id: r.hdId })} />
              </label>
            ) : <span aria-hidden className="-ml-2 mr-1 size-7 flex-none max-[680px]:size-9" />)}
            <span className="flex min-w-0 flex-1 flex-col gap-px pt-px">
              <span className="flex min-w-0 items-center gap-1.5">
                {fl.attention && (
                  <span className="inline-flex flex-none text-danger" title={t('hd.attn.t')}>
                    <AlertTriangle aria-hidden className="size-[13px]" /><span className="sr-only">{t('hd.attn.t')}, </span>
                  </span>
                )}
                <HdFlag raw={r.uuTien} />
                <span title={r.tieuDe} className={cn('min-w-0 truncate text-sm font-medium leading-5 text-ink max-[680px]:line-clamp-2 max-[680px]:whitespace-normal max-[680px]:[overflow-wrap:anywhere]', fl.pushed && 'font-normal text-ink-2')}>
                  {r.tieuDe}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2.5 text-xs">
                <span className="flex-none font-mono text-ink-3">{r.hdId}</span>
                {fl.pushed && (
                  <span className="inline-flex flex-none items-center gap-1 font-medium" style={{ color: 'var(--c-done)' }} data-testid="hd-pushed">
                    <CheckCircle2 aria-hidden className="size-3.5" />{t('hd.view.pushed')}
                  </span>
                )}
              </span>
            </span>
          </span>
        );
      },
    },
    {
      key: 'req', width: '156px', mobileOrder: 1,
      header: t('hd.col.req'),
      cell: (r) => (
        <span className={cn('flex min-w-0 flex-col leading-tight max-[680px]:max-w-[38vw]', p.canManage && 'max-[680px]:pl-[34px]')}>
          <b className="truncate text-[13px] font-normal text-ink max-[680px]:text-xs">{r.nhanVien || '—'}</b>
          <small className="truncate text-xs text-ink-3 max-[680px]:hidden">{r.phongBan}</small>
        </span>
      ),
    },
    { key: 'st', width: '132px', mobileOrder: 2, header: t('hd.col.status'), cell: (r) => <HdStatus raw={r.trangThai} className="max-[680px]:text-xs" /> },
    {
      key: 'as', width: '148px', mobile: 'hide', hideBelow: 'md',
      header: t('hd.col.as'),
      cell: (r) => r.itSupport
        ? <span className="truncate text-[13px] text-ink" title={r.itSupport}>{r.itSupport}</span>
        : <span className="text-[13px] text-ink-3">{t('hd.it.none')}</span>,
    },
    { key: 'at', width: '92px', mobile: 'end', mobileOrder: 3, header: t('hd.col.at'), cell: (r) => <span className="whitespace-nowrap font-mono text-xs tabular-nums text-ink-2">{f.date(r.thoiGian)}</span> },
    { key: 'chev', width: '16px', mobile: 'hide', header: <span className="sr-only">{t('act.open')}</span>, cell: () => <ChevronRight aria-hidden className="size-4 text-ink-3" />, align: 'end' },
  ];

  return (
    <DataTable
      ariaLabel={t('hd.title')}
      className="v2-hd"
      data-testid="hd-table"
      columns={columns}
      rows={p.rows}
      getRowId={(r) => r.id}
      rowClassName={(r) => cn(rowFlags(r).attention && 'hd-attn', p.selected.has(r.id) && 'hd-on')}
      loading={p.loading}
      error={p.error ? t('hd.loadErr.d') : undefined}
      onRetry={p.onRetry}
      empty={p.filtered
        ? { icon: SearchX, title: t('hd.none._'), description: t('hd.none.d') }
        : { icon: Inbox, title: t('hd.empty.t'), description: t(p.canManage ? 'hd.empty.dBoss' : 'hd.empty.dEmp') }}
      onRowClick={p.onOpen}
      selectedId={p.openId ?? undefined}
    />
  );
}

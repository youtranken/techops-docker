'use client';

/**
 * Trang Helpdesk V2 (A3-3) — preview `helpdesk.html`. Nghiệp vụ giữ V1:
 * - Mọi người có menu Helpdesk xem danh sách + xuất Excel; Boss/Admin thêm khu đồng bộ, Nhập dữ liệu, chọn nhiều,
 *   gán người (= tạo việc), xoá, lịch tự động, lịch sử, đẩy tất cả sang công việc; chỉ Admin: Đặt lại dữ liệu (OTP).
 * - Danh sách: phân trang + lọc phía server (`hd-logic.ts`, test đối chiếu V1), bộ lọc là state của trang như V1.
 * Không có ở V1 → chưa làm (Phase B): tab Cần chú ý / Chưa tạo / Đã tạo, đếm "chưa tạo công việc", xem trước khi nhập,
 * tạo việc cho riêng ticket đã chọn, chọn sẵn người theo IT Support, liên kết sang công việc đã tạo.
 */
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Clock, Download, History, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/shared/ui/Pagination';
import { QuickMenu } from '@/shared/ui/QuickMenu';
import type { HelpdeskPendingItem, PendingFilters } from '../../types';
import { useHelpdeskPending, useHelpdeskFilterOptions } from '../../hooks/useHelpdeskPending';
import { useHelpdeskSyncLogs } from '../../hooks/useHelpdeskSync';
import { useHelpdeskCronConfig } from '../../hooks/useHelpdeskCronConfig';
import { useHdAssignableUsers } from '../../hooks/useAssignableUsers';
import {
  INITIAL_FILTERS, HD_PAGE_SIZES, applyFilterForm, chipKeys, clearForm, hasActiveFilter, pageSizeTo, pageTo, setFilter,
  toggleAllOnPage, toggleOne,
} from './hd-logic';
import { HdChips, HdFilterButton, HdFilterDialog, HdSearch } from './HdFilters';
import { HdTable } from './HdTable';
import { HdBulkBar } from './HdBulkBar';
import { HdSyncBar } from './HdSyncBar';
import { HdTicketDrawer } from './HdTicketDrawer';
import { HdAssignDialog } from './HdAssignDialog';
import { HdCronDialog } from './HdCronDialog';
import { HdHistoryDrawer } from './HdHistoryDrawer';
import { HdImportDialog } from './HdImportDialog';
import { HdResetDialog } from './HdResetDialog';
import { useHdActions } from './useHdActions';

type Dlg = 'filter' | 'assign' | 'bulk' | 'cron' | 'hist' | 'import' | 'reset' | null;

export function HelpdeskPage() {
  const t = useTranslations();
  const { data: session } = useSession();
  const role = session?.user?.role?.name ?? '';
  const canManage = role === 'ADMIN' || role === 'BOSS';
  const isAdmin = role === 'ADMIN';

  const [filters, setFilters] = React.useState<PendingFilters>(INITIAL_FILTERS);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [openItem, setOpenItem] = React.useState<HelpdeskPendingItem | null>(null);
  const [assignItem, setAssignItem] = React.useState<HelpdeskPendingItem | null>(null);
  const [dlg, setDlg] = React.useState<Dlg>(null);
  const fBtn = React.useRef<HTMLButtonElement>(null);

  const list = useHelpdeskPending(filters);
  const { data: options } = useHelpdeskFilterOptions();
  const logs = useHelpdeskSyncLogs(canManage);
  const { config: cron } = useHelpdeskCronConfig(canManage);
  const users = useHdAssignableUsers(dlg === 'bulk');
  const a = useHdActions();

  const rows = list.data?.data ?? [];
  const total = list.data?.total;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;

  // trang vượt số trang (vd sau khi xoá) → về trang cuối
  React.useEffect(() => {
    if (total === undefined) return;
    const pages = Math.max(1, Math.ceil(total / limit));
    if (page > pages) setFilters((p) => pageTo(p, pages));
  }, [total, limit, page]);

  const onSearch = React.useCallback((v: string) => setFilters((p) => setFilter(p, 'search', v)), []);
  const closeDlg = () => setDlg(null);
  const unselect = (ids: string[]) => setSelected((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n; });

  const menu = canManage ? [[
    { key: 'cron', label: t('hd.cron.title'), icon: Clock, onSelect: () => setDlg('cron') },
    { key: 'hist', label: t('hd.hist.title'), icon: History, onSelect: () => setDlg('hist') },
  ], isAdmin ? [{ key: 'reset', label: t('hd.reset.menu'), icon: Trash2, danger: true, onSelect: () => setDlg('reset') }] : []] : [];

  return (
    <div data-testid="hd-page">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-head text-[22px] font-semibold leading-tight text-ink">{t('hd.title')}</h1>
          <p className="m-0 mt-1 text-[13px] text-ink-3" data-testid="hd-total">{total !== undefined ? t('hdx.total', { n: total }) : t('app.loading')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="md" onClick={() => void a.exportExcel(filters)} className="max-[680px]:h-11" data-testid="hd-export">
            <Download aria-hidden /><span className="max-[680px]:sr-only">{t('page.export')}</span>
          </Button>
          {canManage && (
            <Button type="button" variant="outline" size="md" onClick={() => setDlg('import')} className="max-[680px]:h-11" data-testid="hd-import-btn">
              <Upload aria-hidden /><span className="max-[680px]:sr-only">{t('hd.imp.btn')}</span>
            </Button>
          )}
          {canManage && <span data-testid="hd-more"><QuickMenu groups={menu} label={t('hd.more')} triggerClassName="size-9 max-[680px]:size-11" /></span>}
        </div>
      </div>

      {canManage && (
        <HdSyncBar last={logs.data?.[0] ?? null} syncing={a.syncing} error={a.syncError} cron={cron}
          onSync={a.syncNow} onCron={() => setDlg('cron')} onHistory={() => setDlg('hist')} />
      )}

      <div className="mb-4 flex items-center gap-2 border-b border-line pb-3 max-[680px]:pb-3">
        <HdSearch value={filters.search ?? ''} onChange={onSearch} />
        <HdFilterButton btnRef={fBtn} count={chipKeys(filters).length} onClick={() => setDlg('filter')} />
      </div>
      <HdChips filters={filters} onRemove={(k) => setFilters((p) => setFilter(p, k, ''))} onClear={() => setFilters((p) => clearForm(p))} />

      {canManage && (
        <HdBulkBar count={selected.size} busy={a.deleting || a.assignPending}
          onAssign={() => setDlg('bulk')} onClear={() => setSelected(new Set())}
          onDelete={() => void a.deleteMany([...selected], () => setSelected(new Set()))} />
      )}

      <HdTable rows={rows} loading={list.isLoading} error={list.isError} onRetry={() => void list.refetch()}
        filtered={hasActiveFilter(filters)} canManage={canManage}
        selected={selected} onToggle={(id) => setSelected((p) => toggleOne(p, id))} onToggleAll={(on) => setSelected((p) => toggleAllOnPage(p, rows, on))}
        openId={openItem?.id ?? null} onOpen={setOpenItem} />

      {total !== undefined && (
        <Pagination page={page} pageSize={limit} total={total} pageSizes={HD_PAGE_SIZES}
          onPageChange={(p) => setFilters((f) => pageTo(f, p))} onPageSizeChange={(s) => setFilters((f) => pageSizeTo(f, s))} />
      )}

      <HdTicketDrawer item={openItem} canManage={canManage} onClose={() => setOpenItem(null)}
        onCreate={(it) => { setAssignItem(it); setDlg('assign'); }}
        onDelete={(it) => void a.deleteOne(it, () => { setOpenItem(null); unselect([it.id]); })} />

      <HdFilterDialog open={dlg === 'filter'} filters={filters} options={options} onClose={() => { closeDlg(); fBtn.current?.focus(); }}
        onApply={(form) => { setFilters((p) => applyFilterForm(p, form)); closeDlg(); }} />
      <HdAssignDialog open={dlg === 'assign' && !!assignItem} item={assignItem} count={1} pending={a.assignPending} onClose={closeDlg}
        onConfirm={(uid) => assignItem && a.assignOne(assignItem, uid, () => { closeDlg(); setOpenItem(null); unselect([assignItem.id]); })} />
      <HdAssignDialog open={dlg === 'bulk'} item={null} count={selected.size} pending={a.assignPending} onClose={closeDlg}
        onConfirm={(uid) => a.assignMany([...selected], uid, users.data?.find((u) => u.id === uid)?.displayName ?? '', () => { closeDlg(); setSelected(new Set()); })} />
      {canManage && <HdCronDialog open={dlg === 'cron'} onClose={closeDlg} />}
      {canManage && <HdHistoryDrawer open={dlg === 'hist'} logs={logs.data} loading={logs.isLoading} error={logs.isError} onRetry={() => void logs.refetch()} onClose={closeDlg} />}
      {canManage && <HdImportDialog open={dlg === 'import'} onClose={closeDlg} />}
      {isAdmin && <HdResetDialog open={dlg === 'reset'} onClose={closeDlg} onDone={() => { setSelected(new Set()); setOpenItem(null); }} />}
    </div>
  );
}

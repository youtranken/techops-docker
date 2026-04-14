'use client';

import { useState } from 'react';
import { Headset, Download, Users, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { HelpdeskPendingItem, PendingFilters } from '@/modules/helpdesk/types';
import { useHelpdeskPending, useHelpdeskFilterOptions } from '../hooks/useHelpdeskPending';
import {
  useAssignHelpdesk, useDeleteHelpdesk,
  useBulkAssignHelpdesk, useBulkDeleteHelpdesk,
} from '../hooks/useHelpdeskMutations';
import { HelpdeskTicketTable }  from '../components/tickets/HelpdeskTicketTable';
import { TicketFilterBar }      from '../components/tickets/TicketFilterBar';
import { TicketPagination }     from '../components/tickets/TicketPagination';
import { AssignHelpdeskModal }  from '../components/modals/AssignHelpdeskModal';
import { BulkAssignModal }      from '../components/modals/BulkAssignModal';
import { TicketDetailSheet }    from '../components/tickets/TicketDetailSheet';

export function TicketListSection() {
  const [filters,      setFilters]      = useState<PendingFilters>({ limit: 25 });
  const [assignTarget, setAssignTarget] = useState<HelpdeskPendingItem | null>(null);
  const [detailItem,   setDetailItem]   = useState<HelpdeskPendingItem | null>(null);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [bulkOpen,     setBulkOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDelOpen,  setBulkDelOpen]  = useState(false);

  const { data, isLoading }   = useHelpdeskPending(filters);
  const { data: options }     = useHelpdeskFilterOptions();
  const assignMutation        = useAssignHelpdesk();
  const deleteMutation        = useDeleteHelpdesk();
  const bulkAssignMutation    = useBulkAssignHelpdesk();
  const bulkDeleteMutation    = useBulkDeleteHelpdesk();

  const currentPage  = filters.page  ?? 1;
  const pageSize     = filters.limit ?? 25;
  const totalCount   = data?.total   ?? 0;
  const pendingItems = data?.data    ?? [];
  const totalPages   = Math.max(1, Math.ceil(totalCount / pageSize));

  const hasActiveFilter = Object.keys(filters).some(
    (k) => k !== 'page' && k !== 'limit' && filters[k as keyof PendingFilters],
  );

  function setFilter(key: keyof Omit<PendingFilters, 'page' | 'limit'>, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: undefined }));
  }

  function clearFilters() { setFilters({ limit: pageSize }); }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleAssignConfirm(id: string, assigneeId: string) {
    assignMutation.mutate({ id, assigneeId }, { onSuccess: () => setAssignTarget(null) });
  }

  function handleBulkAssignConfirm(assigneeId: string) {
    bulkAssignMutation.mutate(
      { ids: Array.from(selectedIds), assigneeId },
      { onSuccess: () => { setSelectedIds(new Set()); setBulkOpen(false); } },
    );
  }

  function handleBulkDeleteConfirm() {
    bulkDeleteMutation.mutate(
      Array.from(selectedIds),
      { onSuccess: () => { setSelectedIds(new Set()); setBulkDelOpen(false); } },
    );
  }

  async function handleExportExcel() {
    const params = new URLSearchParams();
    if (filters.search)    params.set('search',    filters.search);
    if (filters.uuTien)    params.set('uuTien',    filters.uuTien);
    if (filters.trangThai) params.set('trangThai', filters.trangThai);
    if (filters.itSupport) params.set('itSupport', filters.itSupport);
    if (filters.dateFrom)  params.set('dateFrom',  filters.dateFrom);
    if (filters.dateTo)    params.set('dateTo',    filters.dateTo);
    params.set('export', 'xlsx');
    const res  = await fetch(`/api/integrations/helpdesk/unassigned?${params.toString()}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `helpdesk-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Headset className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Danh sách ticket</h2>
            <p className="text-sm text-muted-foreground">
              {!isLoading
                ? <span>Tổng cộng <Badge variant="secondary" className="font-mono">{totalCount}</Badge> ticket</span>
                : 'Đang tải...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Gán {selectedIds.size} ticket
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBulkDelOpen(true)}
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                <Trash2 className="h-3.5 w-3.5" />
                Xóa {selectedIds.size} ticket
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => void handleExportExcel()} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Xuất Excel
          </Button>
        </div>
      </div>

      <TicketFilterBar
        filters={filters} options={options}
        hasActiveFilter={hasActiveFilter}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
      />

      <HelpdeskTicketTable
        data={pendingItems} isLoading={isLoading}
        onAssign={setAssignTarget}
        onDelete={(id) => setDeleteTarget(id)}
        onViewDetail={setDetailItem}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
      />

      <TicketPagination
        currentPage={currentPage} totalPages={totalPages}
        totalCount={totalCount}  pageSize={pageSize}
        onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
        onPageSizeChange={(s) => setFilters((prev) => ({ ...prev, limit: s, page: undefined }))}
      />

      <AssignHelpdeskModal
        item={assignTarget} open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        onConfirm={handleAssignConfirm}
        isSubmitting={assignMutation.isPending}
      />

      <TicketDetailSheet
        item={detailItem} open={detailItem !== null}
        onClose={() => setDetailItem(null)}
      />

      <BulkAssignModal
        selectedCount={selectedIds.size} open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={handleBulkAssignConfirm}
        isSubmitting={bulkAssignMutation.isPending}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ticket?</AlertDialogTitle>
            <AlertDialogDescription>Ticket sẽ bị xóa khỏi danh sách chờ. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget); } setDeleteTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDelOpen} onOpenChange={(o) => { if (!o) setBulkDelOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {selectedIds.size} ticket?</AlertDialogTitle>
            <AlertDialogDescription>Tất cả ticket đã chọn sẽ bị xóa khỏi danh sách chờ. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm} disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleteMutation.isPending ? 'Đang xóa...' : `Xóa ${selectedIds.size} ticket`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

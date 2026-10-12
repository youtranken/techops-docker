'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListTodo, Plus, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskList } from '../../hooks/useTaskList';
import { usePriorities } from '@/modules/settings/hooks/usePriorities';
import { useTaskTypes } from '@/modules/settings/hooks/useTaskTypes';
import { useTaskListModals } from '../../hooks/useTaskListModals';
import { TaskListFilters } from './TaskListFilters';
import { TaskListGrid } from './TaskListGrid';
import { TaskListPagination } from './TaskListPagination';
import { TaskListModals } from './TaskListModals';
import type { TaskListItem, TaskSortField, TaskSortOrder } from '../../services/task-query.service';
import type { TaskStatus } from '@prisma/client';

const VALID_TASK_STATUSES: TaskStatus[] = [
  'PENDING_APPROVAL', 'IN_PROGRESS', 'PENDING_REVIEW', 'WAITING_ACKNOWLEDGE', 'COMPLETED', 'CANCELLED',
];
const VALID_SOURCES = ['helpdesk', 'techops'] as const;

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt:desc', label: 'Mới nhất' },
  { value: 'createdAt:asc',  label: 'Cũ nhất' },
  { value: 'scheduleEnd:asc',  label: 'Deadline gần nhất' },
  { value: 'scheduleEnd:desc', label: 'Deadline xa nhất' },
  { value: 'title:asc',  label: 'Tên A → Z' },
  { value: 'title:desc', label: 'Tên Z → A' },
  { value: 'status:asc', label: 'Trạng thái' },
];

export function TaskListClient() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const role          = session?.user?.role?.name ?? '';

  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper đọc/ghi URL params
  const getParam = useCallback((key: string, def = '') => searchParams.get(key) ?? def, [searchParams]);
  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === '') params.delete(k);
      else params.set(k, v);
    });
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // ── Filters — sync với URL ─────────────────────────────────────────────────
  const search     = getParam('search');
  const status     = getParam('status');
  const priorityId = getParam('priorityId');
  const typeId     = getParam('typeId');
  const source     = getParam('source');
  const datePreset = getParam('datePreset');
  const dateFrom   = getParam('dateFrom');
  const dateTo     = getParam('dateTo');
  const page       = Number(getParam('page', '1'))  || 1;
  const limit      = Number(getParam('limit', '20')) || 20;
  const sortKey    = getParam('sort', 'createdAt:desc');

  const VALID_SORT_FIELDS: TaskSortField[] = ['createdAt', 'scheduleEnd', 'title', 'status'];
  const VALID_SORT_ORDERS: TaskSortOrder[] = ['asc', 'desc'];
  const [rawSortField, rawSortOrder] = sortKey.split(':');
  const sortField = (VALID_SORT_FIELDS.includes(rawSortField as TaskSortField) ? rawSortField : 'createdAt') as TaskSortField;
  const sortOrder = (VALID_SORT_ORDERS.includes(rawSortOrder as TaskSortOrder) ? rawSortOrder : 'desc') as TaskSortOrder;
  const normalizedSortKey = `${sortField}:${sortOrder}` as const;

  function setSearch(v: string)     { updateParams({ search: v || undefined, page: undefined }); }
  function setStatus(v: string)     { updateParams({ status: v || undefined, page: undefined }); }
  function setPriorityId(v: string) { updateParams({ priorityId: v || undefined, page: undefined }); }
  function setTypeId(v: string)     { updateParams({ typeId: v || undefined, page: undefined }); }
  function setSource(v: string)     { updateParams({ source: v || undefined, page: undefined }); }
  function setDatePreset(v: string) { updateParams({ datePreset: v || undefined, dateFrom: undefined, dateTo: undefined, page: undefined }); }
  function setDateFrom(v: string)   { updateParams({ dateFrom: v || undefined, datePreset: undefined, page: undefined }); }
  function setDateTo(v: string)     { updateParams({ dateTo: v || undefined, datePreset: undefined, page: undefined }); }
  function setPage(p: number)       { updateParams({ page: p > 1 ? String(p) : undefined }); }
  function setSort(v: string)       { updateParams({ sort: v !== 'createdAt:desc' ? v : undefined, page: undefined }); }

  function resolveDates() {
    if (dateFrom || dateTo) return { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
    const now = new Date(); const pad = (d: Date) => d.toISOString().slice(0, 10);
    if (datePreset === 'today')   return { dateFrom: pad(now), dateTo: pad(now) };
    if (datePreset === '7d')      return { dateFrom: pad(now), dateTo: pad(new Date(now.getTime() + 7  * 86400000)) };
    if (datePreset === '30d')     return { dateFrom: pad(now), dateTo: pad(new Date(now.getTime() + 30 * 86400000)) };
    if (datePreset === 'overdue') return { dateTo: pad(new Date(now.getTime() - 86400000)) };
    return {};
  }

  // ── Modal / Sheet state ───────────────────────────────────────────────────
  const modals = useTaskListModals();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useTaskList({
    search:     search     || undefined,
    status:     (VALID_TASK_STATUSES.includes(status as TaskStatus) ? status as TaskStatus : undefined),
    priorityId: priorityId || undefined,
    typeId:     typeId     || undefined,
    source:     (VALID_SOURCES.includes(source as typeof VALID_SOURCES[number]) ? source as typeof VALID_SOURCES[number] : undefined),
    ...resolveDates(),
    sortField,
    sortOrder,
    // Mặc định (không chọn gì) = ẩn task Hoàn thành; 'all' = hiện tất cả
    hideCompleted: !status,
    page,
    limit,
  });
  const { data: priorities = [] } = usePriorities();
  const { data: taskTypes  = [] } = useTaskTypes();

  const tasks      = data?.data       ?? [];
  const pagination = data?.pagination;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTodo className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Công việc</h1>
            <p className="text-sm text-muted-foreground">
              {pagination ? (
                <span>
                  Tổng cộng{' '}
                  <Badge variant="secondary" className="font-mono">{pagination.total}</Badge>{' '}
                  công việc
                </span>
              ) : 'Đang tải...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <Select value={normalizedSortKey} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-48 text-sm gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => modals.setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />Tạo công việc
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <TaskListFilters
        search={search}
        status={status}
        priorityId={priorityId}
        typeId={typeId}
        source={source}
        datePreset={datePreset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        priorities={priorities}
        taskTypes={taskTypes}
        onSearchChange={handleSearchChange}
        onStatusChange={(v) => setStatus(v === 'active' ? '' : v)}
        onPriorityChange={(v) => setPriorityId(v === 'all' ? '' : v)}
        onTypeChange={(v) => setTypeId(v === 'all' ? '' : v)}
        onSourceChange={(v) => setSource(v === 'all' ? '' : v)}
        onDatePresetChange={(v) => setDatePreset(v === 'all' ? '' : v)}
        onDateFromChange={(v) => setDateFrom(v)}
        onDateToChange={(v) => setDateTo(v)}
      />

      {/* ── Task Grid ───────────────────────────────────────────────────────── */}
      <TaskListGrid
        tasks={tasks}
        isLoading={isLoading}
        isError={isError}
        currentUserId={currentUserId}
        role={role}
        onCreateClick={() => modals.setShowCreate(true)}
        onOpenQuickView={modals.setQuickViewTaskId}
        onEdit={modals.setEditingTask}
        onOpenComplete={modals.setCompleteTaskId}
        onOpenTransfer={modals.setTransferTaskId}
        onOpenRejectTask={modals.setRejectTaskId}
        onOpenRejectReview={modals.setRejectReviewId}
        onOpenCancel={modals.setCancelTaskId}
        onOpenRestore={modals.setRestoreTaskId}
        onOpenRejectPlan={modals.setRejectPlanTaskId}
        onOpenExtension={modals.setExtensionTaskId}
        onOpenApproveExtension={(taskId, extId) => modals.setApproveExtState({ taskId, extId })}
      />

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {pagination && pagination.totalPages >= 1 && (
        <TaskListPagination
          pagination={{ ...pagination, limit }}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => { updateParams({ limit: l !== 20 ? String(l) : undefined, page: undefined }); }}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <TaskListModals
        tasks={tasks}
        currentUserId={currentUserId}
        role={role}
        {...modals}
      />
    </div>
  );
}

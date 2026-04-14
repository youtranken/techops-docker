'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListTodo, Plus } from 'lucide-react';
import { useTaskList } from '../../hooks/useTaskList';
import { useDeleteTask } from '../../actions/hooks/useDeleteTask';
import { usePriorities } from '@/modules/settings/hooks/usePriorities';
import { useTaskTypes } from '@/modules/settings/hooks/useTaskTypes';
import { useTaskListModals } from '../../hooks/useTaskListModals';
import { TaskListFilters } from './TaskListFilters';
import { TaskListGrid } from './TaskListGrid';
import { TaskListPagination } from './TaskListPagination';
import { TaskListModals } from './TaskListModals';
import type { TaskListItem } from '../../services/task-query.service';
import type { TaskStatus } from '@prisma/client';

export function TaskListClient() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const role          = session?.user?.role?.name ?? '';

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState<string>('');
  const [priorityId, setPriorityId] = useState('');
  const [typeId,     setTypeId]     = useState('');
  const [source,     setSource]     = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [page,       setPage]       = useState(1);
  const [limit,      setLimit]      = useState(20);

  function resolveDates() {
    if (dateFrom || dateTo) return { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
    const now = new Date(); const pad = (d: Date) => d.toISOString().slice(0, 10);
    if (datePreset === 'today')  return { dateFrom: pad(now), dateTo: pad(now) };
    if (datePreset === '7d')  return { dateFrom: pad(now), dateTo: pad(new Date(now.getTime() + 7  * 86400000)) };
    if (datePreset === '30d') return { dateFrom: pad(now), dateTo: pad(new Date(now.getTime() + 30 * 86400000)) };
    if (datePreset === 'overdue') return { dateTo: pad(new Date(now.getTime() - 86400000)) };
    return {};
  }

  // ── Modal / Sheet state ───────────────────────────────────────────────────
  const modals = useTaskListModals();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useTaskList({
    search:     search     || undefined,
    status:     (status as TaskStatus) || undefined,
    priorityId: priorityId || undefined,
    typeId:     typeId     || undefined,
    source:     (source as 'helpdesk' | 'techops') || undefined,
    ...resolveDates(),
    page,
    limit,
  });
  const { data: priorities = [] } = usePriorities();
  const { data: taskTypes  = [] } = useTaskTypes();
  const deleteTask = useDeleteTask();

  const tasks      = data?.data       ?? [];
  const pagination = data?.pagination;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  async function handleDelete(task: TaskListItem) {
    if (!confirm(`Xóa công việc "${task.title}"?`)) return;
    try {
      await deleteTask.mutateAsync(task.id);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
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
        <Button onClick={() => modals.setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />Tạo công việc
        </Button>
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
        onStatusChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}
        onPriorityChange={(v) => { setPriorityId(v === 'all' ? '' : v); setPage(1); }}
        onTypeChange={(v) => { setTypeId(v === 'all' ? '' : v); setPage(1); }}
        onSourceChange={(v) => { setSource(v === 'all' ? '' : v); setPage(1); }}
        onDatePresetChange={(v) => { setDatePreset(v === 'all' ? '' : v); setDateFrom(''); setDateTo(''); setPage(1); }}
        onDateFromChange={(v) => { setDateFrom(v); setDatePreset(''); setPage(1); }}
        onDateToChange={(v) => { setDateTo(v); setDatePreset(''); setPage(1); }}
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
        onDelete={handleDelete}
        onOpenComplete={modals.setCompleteTaskId}
        onOpenTransfer={modals.setTransferTaskId}
        onOpenRejectTask={modals.setRejectTaskId}
        onOpenRejectReview={modals.setRejectReviewId}
        onOpenCancel={modals.setCancelTaskId}
        onOpenRejectPlan={modals.setRejectPlanTaskId}
        onOpenExtension={modals.setExtensionTaskId}
        onOpenApproveExtension={(taskId, extId) => modals.setApproveExtState({ taskId, extId })}
      />

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {pagination && pagination.totalPages >= 1 && (
        <TaskListPagination
          pagination={{ ...pagination, limit }}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
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

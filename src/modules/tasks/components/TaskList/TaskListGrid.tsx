'use client';

/**
 * Bảng danh sách công việc V2 (preview tasks-list A2 "quiet list"):
 *   Mã | Công việc (chấm chưa xem + ★ + tiêu đề) | Ưu tiên | Người làm | Trạng thái | Hạn | ⋯
 * - 681–1100px ẩn cột Người làm; ≤680 mỗi dòng 3 tầng: [mã · ưu tiên … ⋯] / tiêu đề / [trạng thái · hạn … người làm].
 * - Bấm dòng = Xem nhanh (ngăn chi tiết). Menu ⋯ chỉ có hành động V1 cho phép (`quickMenuKeys` ← `useTaskPermissions`).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Eye, ExternalLink, Copy, Check, X, UserCheck, Ban, FileCheck2, FilePlus2, ClipboardCheck, RotateCcw,
  CalendarPlus, CalendarClock, ArrowRightLeft, ArchiveRestore, Pencil, Star, XCircle, MessageCircle, ChevronDown, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useFormat } from '@/i18n/useFormat';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { QuickMenu, type QuickMenuItem } from '@/shared/ui/QuickMenu';
import { StatusDot } from '@/shared/ui/StatusDot';
import { PriorityFlag } from '@/shared/ui/PriorityFlag';
import { DueText } from '@/shared/ui/DueText';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { assigneeStatusMeta, metaLabel } from '@/shared/ui/status-meta';
import { useTaskPermissions } from '../../actions/hooks/useTaskPermissions';
import { useToggleImportant } from '../../hooks/useTaskTracking';
import type { TaskListItem } from '../../services/task-query.service';
import {
  quickMenuKeys, latestPendingExtension, displayCode, headerSort,
  type QuickActionKey, type ListState, type AriaSort,
} from './list-logic';

type Icon = React.ComponentType<{ className?: string }>;
const QA: Record<Exclude<QuickActionKey, 'star' | 'approve-extension'>, { label: string; icon: Icon }> = {
  view: { label: 'qa.view', icon: Eye },
  open: { label: 'td.openFull', icon: ExternalLink },
  copy: { label: 'qa.copy', icon: Copy },
  'approve-plan': { label: 'act.approve', icon: Check },
  'reject-plan': { label: 'act.decline', icon: X },
  acknowledge: { label: 'act.accept', icon: UserCheck },
  'reject-task': { label: 'tlx.qa.declineTask', icon: Ban },
  complete: { label: 'act.report', icon: FileCheck2 },
  supplement: { label: 'act.supplement', icon: FilePlus2 },
  'approve-review': { label: 'act.review', icon: ClipboardCheck },
  'reject-review': { label: 'act.rework', icon: RotateCcw },
  extension: { label: 'act.extend', icon: CalendarPlus },
  transfer: { label: 'act.transfer', icon: ArrowRightLeft },
  restore: { label: 'act.restore', icon: ArchiveRestore },
  edit: { label: 'act.edit', icon: Pencil },
  cancel: { label: 'act.cancel', icon: XCircle },
};

export interface TaskRowAction {
  key: QuickActionKey;
  task: TaskListItem;
  /** Đơn gia hạn được duyệt (approve-extension) */
  extId?: string;
}

export interface TaskListGridProps {
  tasks: TaskListItem[];
  state: ListState;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  currentUserId: string;
  role: string;
  selectedId?: string | null;
  /** Có điều kiện lọc/tìm kiếm → thông điệp rỗng "không khớp bộ lọc" */
  filtered: boolean;
  onClearFilters?: () => void;
  onCreateClick: () => void;
  onAction: (a: TaskRowAction) => void;
  onSort: (sortKey: string) => void;
}

// ───────────────────────────── Ô ─────────────────────────────
function StarToggle({ task }: { task: TaskListItem }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const toggle = useToggleImportant();
  const on = task.isImportant;
  const label = t(on ? 'card.unstar' : 'card.star');
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate({ id: task.id, isImportant: !on }, { onError: (err) => toast.error(errMsg(err)) });
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        'grid size-6 flex-none place-items-center rounded-sm text-ink-3 outline-none hover:text-amber disabled:opacity-50',
        'focus-visible:ring-2 focus-visible:ring-ring',
        // ≤680: ★ chỉ là dấu hiệu (bật/tắt qua menu ⋯ — mục chạm 44px); ★ chưa bật thì ẩn
        on ? 'text-amber max-[680px]:pointer-events-none max-[680px]:size-5' : 'tl-star-off max-[680px]:hidden',
      )}
    >
      <Star aria-hidden className="size-3.5" fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

function TitleCell({ task, canStar }: { task: TaskListItem; canStar: boolean }) {
  const t = useTranslations();
  const f = useFormat();
  const pendingExt = latestPendingExtension(task.extensions);
  const comments = task._count?.comments ?? 0;
  return (
    <span className="flex w-full min-w-0 items-center gap-2 max-[680px]:items-start">
      {task.isUnseen && (
        <>
          <span aria-hidden className="size-[7px] flex-none rounded-full bg-primary-text max-[680px]:mt-[7px]" data-unseen />
          <span className="sr-only">{t('card.unseen')}, </span>
        </>
      )}
      {canStar ? (
        <StarToggle task={task} />
      ) : null}
      <span
        className={cn(
          'min-w-0 truncate text-sm font-medium leading-5 text-ink',
          task.isUnseen && 'font-semibold',
          'max-[680px]:line-clamp-2 max-[680px]:whitespace-normal max-[680px]:[overflow-wrap:anywhere]',
        )}
        data-title
      >
        {task.title}
      </span>
      {comments > 0 && (
        <span
          className={cn('relative inline-flex flex-none items-center gap-0.5 text-xs text-ink-3', task.hasMention && 'text-primary-text')}
          title={t('card.comments', { n: comments })}
        >
          <MessageCircle aria-hidden className="size-3.5" />
          <span className="font-mono">{comments}</span>
          <span className="sr-only">{t('card.comments', { n: comments })}</span>
          {task.hasMention && (
            <>
              <span aria-hidden className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-danger" />
              <span className="sr-only">, {t('tlx.mention')}</span>
            </>
          )}
        </span>
      )}
      {pendingExt && (
        <span className="inline-flex flex-none text-amber" title={t('tlx.extPending', { d: f.date(pendingExt.requestedDate) })}>
          <CalendarClock aria-hidden className="size-3.5" />
          <span className="sr-only">{t('tlx.extPending', { d: f.date(pendingExt.requestedDate) })}</span>
        </span>
      )}
    </span>
  );
}

function People({ task }: { task: TaskListItem }) {
  const t = useTranslations();
  const a = task.assignees;
  if (!a.length) return <span className="text-[13px] text-ink-3">{t('card.unassigned')}</span>;
  const title = a.map((x) => `${x.user.displayName} · ${metaLabel(assigneeStatusMeta(x.status), t)}`).join('\n');
  return (
    <span className="flex items-center" title={title}>
      <span className="sr-only">{title.replace(/\n/g, ', ')}</span>
      {a.slice(0, 3).map((x, i) => (
        <UserAvatar
          key={x.id}
          displayName={x.user.displayName}
          avatarUrl={x.user.profile?.avatarUrl}
          avatarColor={x.user.profile?.avatarColor}
          size="sm"
          className={cn('ring-2 ring-surface max-[680px]:size-[22px]', i > 0 && '-ml-1.5')}
        />
      ))}
      {a.length > 3 && (
        <span aria-hidden className="-ml-1.5 grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-1 font-mono text-[11px] text-ink-2 ring-2 ring-surface max-[680px]:h-[22px] max-[680px]:min-w-[22px]">
          +{a.length - 3}
        </span>
      )}
    </span>
  );
}

function RowMenu({ task, currentUserId, role, onAction }: { task: TaskListItem; currentUserId: string; role: string; onAction: TaskListGridProps['onAction'] }) {
  const t = useTranslations();
  const f = useFormat();
  const p = useTaskPermissions(task, currentUserId, role);
  const canStar = role === 'ADMIN' || role === 'BOSS';
  const ext = latestPendingExtension(task.extensions);
  const groups = quickMenuKeys(p, { canStar, isImportant: task.isImportant, extensions: task.extensions });
  const item = (k: QuickActionKey): QuickMenuItem => {
    if (k === 'star') {
      return { key: k, label: t(task.isImportant ? 'card.unstar' : 'card.star'), icon: Star, onSelect: () => onAction({ key: k, task }) };
    }
    if (k === 'approve-extension') {
      return {
        key: k, label: t('tlx.qa.approveExt', { d: ext ? f.date(ext.requestedDate) : '' }), icon: CalendarClock,
        onSelect: () => onAction({ key: k, task, extId: ext?.id }),
      };
    }
    return { key: k, label: t(QA[k].label), icon: QA[k].icon, danger: k === 'cancel', onSelect: () => onAction({ key: k, task }) };
  };
  return (
    <QuickMenu
      label={t('qa.menu', { id: displayCode(task) })}
      groups={groups.map((g) => g.map(item))}
      triggerClassName="max-[680px]:size-11 max-[680px]:-my-2 max-[680px]:-mr-2"
    />
  );
}

// ───────────────────────────── Tiêu đề cột sắp xếp ─────────────────────────────
function SortHeader({ label, aria, onClick }: { label: string; aria: AriaSort; onClick: () => void }) {
  const t = useTranslations();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('tl.sortBy', { c: label })}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-sm text-xs text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        aria !== 'none' && 'font-medium text-ink',
      )}
    >
      {label}
      <ChevronDown
        aria-hidden
        className={cn('size-3 transition-transform', aria === 'none' && 'opacity-40', aria === 'ascending' && 'rotate-180')}
      />
    </button>
  );
}

// ───────────────────────────── Bảng ─────────────────────────────
export function TaskListGrid({
  tasks, state, isLoading, isError, onRetry, currentUserId, role, selectedId, filtered, onClearFilters, onCreateClick, onAction, onSort,
}: TaskListGridProps) {
  const t = useTranslations();
  const canStar = role === 'ADMIN' || role === 'BOSS';
  const dueSort = headerSort(state, 'scheduleEnd');
  const stSort = headerSort(state, 'status');

  const columns: DataTableColumn<TaskListItem>[] = [
    {
      key: 'code', header: t('tl.colId'), width: '76px', mobileOrder: 1,
      cell: (x) => <span className="whitespace-nowrap font-mono text-xs text-ink-3" data-code>{displayCode(x)}</span>,
    },
    {
      key: 'task', header: t('tl.colTask'), mobile: 'main', mobileOrder: 4,
      cell: (x) => <TitleCell task={x} canStar={canStar} />,
    },
    {
      key: 'priority', header: t('filter.priority'), width: '96px', mobileOrder: 2,
      cell: (x) => <PriorityFlag level={x.priority.level} name={x.priority.name} className="max-[680px]:text-xs" />,
    },
    {
      key: 'people', header: t('filter.assignee'), width: '96px', hideBelow: 'lg', mobile: 'end', mobileOrder: 7,
      cell: (x) => <People task={x} />,
    },
    {
      key: 'status', width: '156px', mobileOrder: 5,
      header: <SortHeader label={t('filter.status')} aria={stSort.ariaSort} onClick={() => onSort(stSort.next)} />,
      headerProps: { 'aria-sort': stSort.ariaSort },
      cell: (x) => <StatusDot status={x.status} className="max-[680px]:text-xs" />,
    },
    {
      key: 'due', width: '112px', mobileOrder: 6,
      header: <SortHeader label={t('filter.due')} aria={dueSort.ariaSort} onClick={() => onSort(dueSort.next)} />,
      headerProps: { 'aria-sort': dueSort.ariaSort },
      cell: (x) => <DueText dueDate={x.scheduleEnd} status={x.status} className="max-[680px]:text-xs" />,
    },
    {
      key: 'more', header: <span className="sr-only">{t('tl.colMore')}</span>, width: '32px', align: 'end', mobile: 'end', mobileOrder: 3,
      cell: (x) => <RowMenu task={x} currentUserId={currentUserId} role={role} onAction={onAction} />,
    },
  ];

  const empty = filtered
    ? {
        title: t('tl.f.none'),
        description: t('tl.f.noneD'),
        action: onClearFilters ? <Button type="button" variant="outline" size="xs" onClick={onClearFilters}>{t('tl.f.clear')}</Button> : undefined,
      }
    : state.status === 'CANCELLED' && !state.view
      ? { title: t('empty.cancelled.t') }
      : state.status === 'COMPLETED' && !state.view
        ? { title: t('empty.done.t') }
        : {
            title: t('lane.empty'),
            action: (
              <Button type="button" variant="outline" size="xs" onClick={onCreateClick}>
                <Plus aria-hidden />{t('page.new')}
              </Button>
            ),
          };

  return (
    <DataTable
      ariaLabel={t('page.title')}
      columns={columns}
      rows={tasks}
      getRowId={(x) => x.id}
      loading={isLoading}
      skeletonRows={8}
      error={isError ? t('tlx.loadErr') : undefined}
      onRetry={onRetry}
      empty={empty}
      selectedId={selectedId ?? undefined}
      onRowClick={(x) => onAction({ key: 'view', task: x })}
      className="v2-tasks"
    />
  );
}

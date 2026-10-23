'use client';

/**
 * Trang Danh sách công việc V2 (A2-3) — preview `tasks-list.html` (A2 "quiet list").
 * Áp dụng cho /tasks và các mục con ở sidebar (/tasks?view=important · ?view=unseen — chỉ Boss/Admin).
 *
 * Nghiệp vụ giữ V1: tham số URL / payload API / phân trang phía server / sắp xếp (list-logic.ts, có test đối chiếu V1),
 * quyền hành động (useTaskPermissions), ★ (Boss/Admin dùng chung), "chưa xem", "Đánh dấu đã xem tất cả".
 * Mới (thuần client): tab ánh xạ vào tham số V1, bảng lọc + chip, sắp xếp bằng tiêu đề cột, menu ⋯.
 */
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsFetching } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Search, SlidersHorizontal, CheckCheck, Info, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/shared/ui/Pagination';
import { cn } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useMarkAllSeen, useTaskCounters, useToggleImportant } from '../../hooks/useTaskTracking';
import { useTaskList } from '../../hooks/useTaskList';
import { usePriorities } from '@/modules/settings/hooks/usePriorities';
import { useTaskTypes } from '@/modules/settings/hooks/useTaskTypes';
import { useTaskListModals } from '../../hooks/useTaskListModals';
import { copyTaskCode } from '../TaskDetail/DetailActions';
import { TaskListFilters, FilterChips } from './TaskListFilters';
import { TaskListGrid, type TaskRowAction } from './TaskListGrid';
import { TaskListModals } from './TaskListModals';
import { TaskViewSwitch } from './TaskViewSwitch';
import { DraftList } from './DraftList';
import { PhaseBBadge } from '@/shared/ui/PhaseBBadge';
import { useDrafts } from '../TaskForm/useDrafts';
import { TaskBoard, type PendingDrop } from './TaskBoard';
import { useBoardData } from './useBoardData';
import { useTaskListState } from './useTaskListState';
import { resolveViewMode, modeUpdate, VIEW_COOKIE, type TaskViewMode, type BoardCol } from './board-logic';
import {
  tabsFor, activeTab, tabUpdate, filterUpdate, filterCount, clearFiltersUpdate, pageUpdate, limitUpdate, sortUpdate,
  normalizedSortKey, displayCode, SMART_SORT, type ListTab,
} from './list-logic';

const SORT_OPTIONS = [
  'createdAt:desc', 'createdAt:asc', 'scheduleEnd:asc', 'scheduleEnd:desc', 'title:asc', 'title:desc', 'status:asc',
] as const;
const TAB_LABEL: Record<ListTab, string> = {
  open: 'view.open', starred: 'view.starred', unseen: 'view.unseen', done: 'view.done', cancelled: 'view.cancelled',
};

/** Ô tìm kiếm: gõ cập nhật URL sau 300 ms (V1 cập nhật mỗi phím); URL đổi từ ngoài → ô theo. */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations();
  const [text, setText] = React.useState(value);
  const last = React.useRef(value);
  React.useEffect(() => { if (value !== last.current) { last.current = value; setText(value); } }, [value]);
  React.useEffect(() => {
    if (text === last.current) return;
    const h = setTimeout(() => { last.current = text; onChange(text); }, 300);
    return () => clearTimeout(h);
  }, [text, onChange]);
  return (
    <label className="relative flex h-9 min-w-0 flex-1 items-center min-[1400px]:w-[220px] min-[1400px]:flex-none max-[680px]:h-11">
      <Search aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-ink-3" />
      <span className="sr-only">{t('filter.search')}</span>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('filter.search')}
        className="h-full w-full rounded-ctl border border-line-2 bg-surface pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

/** Nhớ chế độ xem (cookie đọc ở server → lần sau mở /tasks không nháy). Lỗi cookie thì bỏ qua. */
function rememberMode(m: TaskViewMode) {
  try { document.cookie = `${VIEW_COOKIE}=${m}; path=/; max-age=31536000; samesite=lax`; } catch { /* bỏ qua */ }
}

export function TaskListClient({ rememberedMode }: { rememberedMode?: string }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const role = session?.user?.role?.name ?? '';

  const { state, update, apiFilters, tracking } = useTaskListState(role);
  const searchParams = useSearchParams();
  const mode = resolveViewMode(searchParams.get('mode'), rememberedMode);
  // Tab "Nháp trên máy này" (A2-4b, Phase B): ?view=drafts — thuần client (localStorage), không gọi API danh sách
  const draftsView = searchParams.get('view') === 'drafts';
  const board = mode === 'board' && !draftsView;
  const modals = useTaskListModals();
  const [fOpen, setFOpen] = React.useState(false);
  const fBtn = React.useRef<HTMLButtonElement>(null);

  const { data, isLoading, isError, refetch } = useTaskList(apiFilters, { enabled: !board && !draftsView });
  const drafts = useDrafts(currentUserId);
  const bd = useBoardData(apiFilters, tracking, board);
  const fetching = useIsFetching({ queryKey: ['tasks'] });
  const [pending, setPending] = React.useState<PendingDrop | null>(null);
  const { data: priorities = [] } = usePriorities();
  const { data: taskTypes = [] } = useTaskTypes();
  const { data: counters } = useTaskCounters(tracking);
  const markAllSeen = useMarkAllSeen();
  const toggleStar = useToggleImportant();

  const listTasks = data?.data ?? [];
  const pagination = board || draftsView ? undefined : data?.pagination;
  /** Việc đang hiển thị (cho hộp thoại + ‹ › của ngăn chi tiết) */
  const tasks = board ? bd.tasks : listTasks;
  const total = board ? (bd.loading ? undefined : bd.total) : pagination?.total;
  const tab = draftsView ? 'drafts' : activeTab(state);
  const nFilters = filterCount(state);
  const filtered = nFilters > 0 || !!state.search;
  const sortKey = normalizedSortKey(state);
  const sortOptions = tracking ? [SMART_SORT, ...SORT_OPTIONS] : [...SORT_OPTIONS];

  // Trang vượt quá số trang (vd sau khi lọc) → về trang cuối có dữ liệu (thuần client)
  React.useEffect(() => {
    if (pagination && pagination.totalPages > 0 && state.page > pagination.totalPages) update(pageUpdate(pagination.totalPages));
  }, [pagination, state.page, update]);

  // Thẻ vừa thả: giữ ở cột đích trong lúc hộp thoại mở; đóng hộp → đợi bảng tải lại (nếu đã làm) rồi bỏ → thẻ về đúng chỗ thật.
  const pendingDialogOpen = !!pending && (modals.confirmState?.taskId === pending.taskId || modals.completeTaskId === pending.taskId);
  React.useEffect(() => {
    if (!pending || pendingDialogOpen || fetching > 0) return;
    const h = setTimeout(() => setPending(null), 120);
    return () => clearTimeout(h);
  }, [pending, pendingDialogOpen, fetching]);

  const onViewMode = (m: TaskViewMode) => { rememberMode(m); setPending(null); update(modeUpdate(m)); };

  const closeFilters = React.useCallback(() => { setFOpen(false); fBtn.current?.focus(); }, []);
  const onSearch = React.useCallback((v: string) => update(filterUpdate('search', v)), [update]);

  function onAction({ key, task, extId }: TaskRowAction) {
    switch (key) {
      case 'view': modals.setQuickViewTaskId(task.id); break;
      case 'open': router.push(`/tasks/${task.id}`); break;
      case 'copy': copyTaskCode(displayCode(task), t); break;
      case 'star':
        toggleStar.mutate(
          { id: task.id, isImportant: !task.isImportant },
          {
            onSuccess: () => toast.success(t(task.isImportant ? 'qa.starOff' : 'qa.starOn', { id: displayCode(task) })),
            onError: (e) => toast.error(errMsg(e)),
          },
        );
        break;
      case 'acknowledge': case 'approve-plan': case 'approve-review':
        modals.setConfirmState({ kind: key, taskId: task.id }); break;
      case 'reject-plan': modals.setRejectPlanTaskId(task.id); break;
      case 'reject-task': modals.setRejectTaskId(task.id); break;
      case 'complete': modals.setCompleteTaskId(task.id); break;
      case 'supplement': modals.setSupplementTaskId(task.id); break;
      case 'reject-review': modals.setRejectReviewId(task.id); break;
      case 'extension': modals.setExtensionTaskId(task.id); break;
      case 'approve-extension': if (extId) modals.setApproveExtState({ taskId: task.id, extId }); break;
      case 'transfer': modals.setTransferTaskId(task.id); break;
      case 'restore': modals.setRestoreTaskId(task.id); break;
      case 'edit': modals.setEditingTask(task.id); break;
      case 'cancel': modals.setCancelTaskId(task.id); break;
    }
  }

  const openCreate = (draftId: string | null = null) => { modals.setCreateDraftId(draftId); modals.setShowCreate(true); };
  const tabCount = (k: ListTab) =>
    k === 'starred' ? counters?.important : k === 'unseen' ? counters?.unseen : k === tab ? total : undefined;

  return (
    <div>
      {/* ── Đầu trang ───────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-head text-[22px] font-semibold leading-tight text-ink">{t('page.title')}</h1>
          <p className="m-0 mt-1 text-[13px] text-ink-3" data-testid="list-total">
            {total !== undefined ? t('tlx.total', { n: total }) : ' '}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tracking && state.view === 'unseen' && tasks.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="md"
              aria-label={t('tl.seenAll._')}
              disabled={markAllSeen.isPending}
              onClick={() => markAllSeen.mutate(undefined, {
                onSuccess: (r: { count?: number }) => toast.success(t('tl.seenAll.done', { n: r.count ?? 0 })),
                onError: (e) => toast.error(errMsg(e)),
              })}
              className="max-[680px]:h-11"
            >
              <CheckCheck aria-hidden />
              <span className="max-[680px]:sr-only">{t('tl.seenAll._')}</span>
            </Button>
          )}
          <Button type="button" size="md" onClick={() => openCreate()} className="max-[680px]:h-11" data-testid="tl-new">
            <Plus aria-hidden />{t('page.new')}
          </Button>
        </div>
      </div>

      {/* ── Tab + công cụ ───────────────────────────────────────────────── */}
      <div className="mb-4 flex items-end gap-4 border-b border-line max-[1399px]:block max-[1399px]:border-b-0">
        <Tabs
          value={tab}
          onValueChange={(v) => update(v === 'drafts' ? { view: 'drafts', status: undefined, page: undefined } : tabUpdate(v as ListTab))}
          className="min-w-0 flex-1"
        >
          <TabsList
            aria-label={t('tlx.views')}
            className="border-b-0 max-[1399px]:border-b max-[680px]:-mx-4 max-[680px]:px-4"
          >
            {tabsFor(tracking).map((k) => (
              <TabsTrigger key={k} value={k} count={tabCount(k)} className="max-[680px]:h-11">
                {t(TAB_LABEL[k])}
              </TabsTrigger>
            ))}
            <TabsTrigger value="drafts" count={drafts.length} className="max-[680px]:h-11" data-testid="tab-drafts">
              {t('dr.tab')}<PhaseBBadge />
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className={cn('flex flex-none items-center gap-2 pb-2 max-[1399px]:pt-3 max-[1399px]:pb-0', draftsView && 'hidden')}>
          <SearchBox value={state.search} onChange={onSearch} />
          <Button
            ref={fBtn}
            type="button"
            variant="outline"
            size="md"
            aria-expanded={fOpen}
            aria-controls="tl-fpanel"
            onClick={() => setFOpen((o) => !o)}
            className={cn('flex-none max-[680px]:h-11 max-[680px]:px-3', nFilters > 0 && 'border-primary-text text-primary-text')}
          >
            <SlidersHorizontal aria-hidden />
            <span>{nFilters ? t('tl.f.n', { n: nFilters }) : t('filter.btn')}</span>
          </Button>
          <label className="relative flex flex-none items-center">
            <span className="sr-only">{t('tlx.sort._')}</span>
            <ArrowUpDown aria-hidden className="pointer-events-none absolute left-2.5 size-3.5 text-ink-3" />
            <select
              value={sortKey}
              onChange={(e) => update(sortUpdate(e.target.value, tracking))}
              title={t('tlx.sort._')}
              className="h-9 max-w-[200px] min-[1600px]:max-w-[260px] rounded-ctl border border-line-2 bg-surface pl-8 pr-7 text-[13px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-11 max-[680px]:w-11 max-[680px]:max-w-11 max-[680px]:px-0 max-[680px]:text-transparent"
            >
              {sortOptions.map((o) => (
                <option key={o} value={o} className="text-ink">{t(`tlx.sort.${o.replace(':', '_')}`)}</option>
              ))}
            </select>
          </label>
          <TaskViewSwitch value={mode} onChange={onViewMode} />
        </div>
      </div>

      {fOpen && !draftsView && (
        <TaskListFilters state={state} priorities={priorities} taskTypes={taskTypes} onUpdate={update} onClose={closeFilters} />
      )}
      {!draftsView && <FilterChips state={state} priorities={priorities} taskTypes={taskTypes} onUpdate={update} />}

      {draftsView && <DraftList userId={currentUserId} drafts={drafts} onOpen={(id) => openCreate(id)} />}

      {tab === 'cancelled' && role !== 'ADMIN' && (
        <p className="mb-3 flex items-center gap-2 text-[13px] text-ink-2">
          <Info aria-hidden className="size-4 flex-none text-ink-3" />
          <span>{t('tl.cx.note')}</span>
        </p>
      )}

      {/* ── Bảng Kanban (A2-4a) | Danh sách ─────────────────────────────── */}
      {draftsView ? null : board ? (
        <TaskBoard
          columns={bd.columns}
          error={bd.error}
          onRetry={bd.refetch}
          currentUserId={currentUserId}
          role={role}
          selectedId={modals.quickViewTaskId}
          pending={pending}
          filteredEmpty={filtered && !bd.loading && bd.total === 0 ? { onClear: nFilters ? () => update(clearFiltersUpdate(state)) : undefined } : null}
          onAction={onAction}
          onDrop={(d, task) => { setPending(d); onAction({ key: d.action, task }); }}
          onShowMore={bd.showMore}
          onOpenColumn={(col: BoardCol) => update({ ...modeUpdate('list'), status: col, view: undefined })}
          onShowDone={() => update(tabUpdate('done'))}
          onCreate={() => openCreate()}
        />
      ) : (
      <TaskListGrid
        tasks={tasks}
        state={state}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        currentUserId={currentUserId}
        role={role}
        selectedId={modals.quickViewTaskId}
        filtered={filtered}
        onClearFilters={nFilters ? () => update(clearFiltersUpdate(state)) : undefined}
        onCreateClick={() => openCreate()}
        onAction={onAction}
        onSort={(v) => update(sortUpdate(v, tracking))}
      />
      )}

      {pagination && (
        <Pagination
          page={state.page}
          pageSize={state.limit}
          total={pagination.total}
          onPageChange={(p) => update(pageUpdate(p))}
          onPageSizeChange={(l) => update(limitUpdate(l))}
        />
      )}

      <TaskListModals tasks={tasks} currentUserId={currentUserId} role={role} {...modals} />
    </div>
  );
}

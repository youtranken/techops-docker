/** BẢN SAO logic V1 (trước A2-3) — mốc đối chiếu cho test danh sách V2. Không dùng trong code chạy.
 *  - `v1Filters`: phần tính payload `useTaskList(...)` của V1 `TaskList/TaskListClient.tsx` (đọc URL → filters API).
 *  - `v1CardMenu`: các mục của V1 `TaskCard/TaskCardMenu.tsx` (menu ⋯ trên thẻ) theo `permissions`.
 */
import type { TaskStatus } from '@prisma/client';
import type { TaskListFilters, TaskSortField, TaskSortOrder } from '../../../services/task-query.service';
import type { TaskPermissions } from '../../../actions/hooks/useTaskPermissions';

const VALID_TASK_STATUSES: TaskStatus[] = [
  'PENDING_APPROVAL', 'IN_PROGRESS', 'PENDING_REVIEW', 'WAITING_ACKNOWLEDGE', 'COMPLETED', 'CANCELLED',
];
const VALID_SOURCES = ['helpdesk', 'techops'] as const;
const SMART_SORT = 'smart';
const isTrackingRole = (role: string) => role === 'BOSS' || role === 'ADMIN';

export function v1Filters(searchParams: URLSearchParams, role: string, nowArg: Date): TaskListFilters {
  const getParam = (key: string, def = '') => searchParams.get(key) ?? def;
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
  const tracking   = isTrackingRole(role);
  const rawView    = getParam('view');
  const view = tracking && (rawView === 'important' || rawView === 'unseen') ? rawView : '';
  const sortKey    = getParam('sort', tracking ? SMART_SORT : 'createdAt:desc');
  const isSmartSort = tracking && sortKey === SMART_SORT;

  const VALID_SORT_FIELDS: TaskSortField[] = ['createdAt', 'scheduleEnd', 'title', 'status'];
  const VALID_SORT_ORDERS: TaskSortOrder[] = ['asc', 'desc'];
  const [rawSortField, rawSortOrder] = sortKey.split(':');
  const sortField = (VALID_SORT_FIELDS.includes(rawSortField as TaskSortField) ? rawSortField : 'createdAt') as TaskSortField;
  const sortOrder = (VALID_SORT_ORDERS.includes(rawSortOrder as TaskSortOrder) ? rawSortOrder : 'desc') as TaskSortOrder;

  function resolveDates() {
    if (dateFrom || dateTo) return { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
    const now = nowArg; const pad = (d: Date) => d.toISOString().slice(0, 10);
    if (datePreset === 'today')   return { dateFrom: pad(now), dateTo: pad(now) };
    if (datePreset === '7d')      return { dateFrom: pad(now), dateTo: pad(new Date(now.getTime() + 7  * 86400000)) };
    if (datePreset === '30d')     return { dateFrom: pad(now), dateTo: pad(new Date(now.getTime() + 30 * 86400000)) };
    if (datePreset === 'overdue') return { dateTo: pad(new Date(now.getTime() - 86400000)) };
    return {};
  }

  return {
    search:     search     || undefined,
    status:     (VALID_TASK_STATUSES.includes(status as TaskStatus) ? status as TaskStatus : undefined),
    priorityId: priorityId || undefined,
    typeId:     typeId     || undefined,
    source:     (VALID_SOURCES.includes(source as typeof VALID_SOURCES[number]) ? source as typeof VALID_SOURCES[number] : undefined),
    ...resolveDates(),
    sortField: isSmartSort ? undefined : sortField,
    sortOrder: isSmartSort ? undefined : sortOrder,
    hideCompleted: !status && view !== 'unseen',
    important:  view === 'important' || undefined,
    unseenOnly: view === 'unseen' || undefined,
    page,
    limit,
  };
}

/** V1 updateParams + các setter của TaskListClient (trả về chuỗi query mới). */
export function v1Update(current: string, updates: Record<string, string | undefined>): string {
  const params = new URLSearchParams(current);
  Object.entries(updates).forEach(([k, v]) => {
    if (v === undefined || v === '') params.delete(k);
    else params.set(k, v);
  });
  return params.toString();
}
export const v1Setters = {
  status:     (v: string) => ({ status: (v === 'active' ? '' : v) || undefined, page: undefined }),
  priorityId: (v: string) => ({ priorityId: (v === 'all' ? '' : v) || undefined, page: undefined }),
  typeId:     (v: string) => ({ typeId: (v === 'all' ? '' : v) || undefined, page: undefined }),
  source:     (v: string) => ({ source: (v === 'all' ? '' : v) || undefined, page: undefined }),
  datePreset: (v: string) => ({ datePreset: (v === 'all' ? '' : v) || undefined, dateFrom: undefined, dateTo: undefined, page: undefined }),
  dateFrom:   (v: string) => ({ dateFrom: v || undefined, datePreset: undefined, page: undefined }),
  dateTo:     (v: string) => ({ dateTo: v || undefined, datePreset: undefined, page: undefined }),
  search:     (v: string) => ({ search: v || undefined, page: undefined }),
  page:       (p: number) => ({ page: p > 1 ? String(p) : undefined }),
  limit:      (l: number) => ({ limit: l !== 20 ? String(l) : undefined, page: undefined }),
  sort:       (v: string, tracking: boolean) => ({ sort: v !== (tracking ? SMART_SORT : 'createdAt:desc') ? v : undefined, page: undefined }),
};

type Ext = { id: string; status: string; requestedDate: Date | string };
/** Mục hành động của V1 TaskCardMenu (bỏ "Xem chi tiết"), theo đúng thứ tự hiển thị V1. */
export function v1CardMenu(p: TaskPermissions, extensions: Ext[]): string[] {
  const out: string[] = [];
  if (p.canAcknowledge) out.push('acknowledge');
  if (p.canComplete) out.push('complete');
  if (p.canApprovePlan) out.push('approve-plan');
  if (p.canRejectPlan) out.push('reject-plan');
  if (p.canApproveReview) out.push('approve-review');
  if (p.canRejectReview) out.push('reject-review');
  if (p.canRejectTask) out.push('reject-task');
  if (p.canTransfer) out.push('transfer');
  if (p.canEdit) out.push('edit');
  if (p.canRequestExtension) out.push('extension');
  if (p.canSupplementReport) out.push('supplement');
  if (p.canApproveExtension && extensions.some((e) => e.status === 'PENDING')) out.push('approve-extension');
  if (p.canCancel) out.push('cancel');
  if (p.canRestore) out.push('restore');
  return out;
}

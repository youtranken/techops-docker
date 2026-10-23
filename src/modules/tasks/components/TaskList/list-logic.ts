/**
 * Logic thuần của Danh sách công việc V2 (A2-3). Không phụ thuộc React → test được (`__tests__/list-logic.test.ts`).
 *
 * NGHIỆP VỤ GIỮ NGUYÊN V1 (đối chiếu `__tests__/v1-list.fixture.ts`):
 * - URL search params ↔ trạng thái lọc ↔ payload `GET /api/tasks` giống hệt V1 TaskListClient (tên tham số,
 *   giá trị mặc định, "Chưa hoàn thành" = hideCompleted, cách quy đổi Thời gian → dateFrom/dateTo).
 * - Menu ⋯ chỉ gồm các hành động V1 TaskCardMenu hiện theo `useTaskPermissions` (không thêm hành động backend).
 * Phần MỚI chỉ là client: tab (ánh xạ vào tham số V1 `view` / `status`), chip bộ lọc, sắp xếp bằng tiêu đề cột.
 */
import type { TaskStatus } from '@prisma/client';
import type { TaskListFilters, TaskSortField, TaskSortOrder } from '../../services/task-query.service';
import type { TaskPermissions } from '../../actions/hooks/useTaskPermissions';

// ───────────────────────────── Trạng thái từ URL ─────────────────────────────
export type TaskView = '' | 'important' | 'unseen';
export const SMART_SORT = 'smart';
export const DEFAULT_LIMIT = 20;
/** Trạng thái lọc được API nhận (V1). DRAFT bị loại khỏi danh sách. */
export const FILTER_STATUSES: TaskStatus[] = [
  'PENDING_APPROVAL', 'IN_PROGRESS', 'PENDING_REVIEW', 'WAITING_ACKNOWLEDGE', 'COMPLETED', 'CANCELLED',
];
/** Thứ tự hiện trong ô chọn trạng thái (theo luồng) */
export const STATUS_OPTIONS: TaskStatus[] = [
  'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED',
];
export const SOURCES = ['techops', 'helpdesk'] as const;
export const DATE_PRESETS = ['today', '7d', '30d', 'overdue'] as const;
const SORT_FIELDS: TaskSortField[] = ['createdAt', 'scheduleEnd', 'title', 'status'];
const SORT_ORDERS: TaskSortOrder[] = ['asc', 'desc'];

export interface ListState {
  tracking: boolean;
  search: string;
  /** '' = Chưa hoàn thành (mặc định V1) · 'all' = Tất cả · hoặc 1 TaskStatus */
  status: string;
  priorityId: string;
  typeId: string;
  source: string;
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
  view: TaskView;
  /** 'smart' (Boss/Admin) hoặc 'field:order' */
  sortKey: string;
}

export const defaultSort = (tracking: boolean) => (tracking ? SMART_SORT : 'createdAt:desc');

export function readListState(get: (key: string) => string | null, tracking: boolean): ListState {
  const p = (k: string, def = '') => get(k) ?? def;
  const rawView = p('view');
  return {
    tracking,
    search: p('search'),
    status: p('status'),
    priorityId: p('priorityId'),
    typeId: p('typeId'),
    source: p('source'),
    datePreset: p('datePreset'),
    dateFrom: p('dateFrom'),
    dateTo: p('dateTo'),
    page: Number(p('page', '1')) || 1,
    limit: Number(p('limit', String(DEFAULT_LIMIT))) || DEFAULT_LIMIT,
    view: tracking && (rawView === 'important' || rawView === 'unseen') ? rawView : '',
    sortKey: p('sort', defaultSort(tracking)),
  };
}

function parseSort(s: ListState) {
  const smart = s.tracking && s.sortKey === SMART_SORT;
  const [f, o] = s.sortKey.split(':');
  const field = (SORT_FIELDS.includes(f as TaskSortField) ? f : 'createdAt') as TaskSortField;
  const order = (SORT_ORDERS.includes(o as TaskSortOrder) ? o : 'desc') as TaskSortOrder;
  return { smart, field, order, key: smart ? SMART_SORT : `${field}:${order}` };
}
/** Giá trị đang chọn của ô Sắp xếp (đã chuẩn hoá như V1) */
export const normalizedSortKey = (s: ListState) => parseSort(s).key;

/** Thời gian → dateFrom/dateTo (V1: theo hạn hoàn thành, ngày ISO UTC). */
export function resolveDates(s: Pick<ListState, 'datePreset' | 'dateFrom' | 'dateTo'>, now: Date): { dateFrom?: string; dateTo?: string } {
  if (s.dateFrom || s.dateTo) return { dateFrom: s.dateFrom || undefined, dateTo: s.dateTo || undefined };
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const day = 86_400_000;
  if (s.datePreset === 'today') return { dateFrom: iso(now), dateTo: iso(now) };
  if (s.datePreset === '7d') return { dateFrom: iso(now), dateTo: iso(new Date(now.getTime() + 7 * day)) };
  if (s.datePreset === '30d') return { dateFrom: iso(now), dateTo: iso(new Date(now.getTime() + 30 * day)) };
  if (s.datePreset === 'overdue') return { dateTo: iso(new Date(now.getTime() - day)) };
  return {};
}

const validStatus = (s: string) => (FILTER_STATUSES.includes(s as TaskStatus) ? (s as TaskStatus) : undefined);
const validSource = (s: string) => ((SOURCES as readonly string[]).includes(s) ? (s as (typeof SOURCES)[number]) : undefined);

/** Payload `useTaskList` — giống hệt V1. */
export function toApiFilters(s: ListState, now: Date): TaskListFilters {
  const sort = parseSort(s);
  return {
    search: s.search || undefined,
    status: validStatus(s.status),
    priorityId: s.priorityId || undefined,
    typeId: s.typeId || undefined,
    source: validSource(s.source),
    ...resolveDates(s, now),
    sortField: sort.smart ? undefined : sort.field,
    sortOrder: sort.smart ? undefined : sort.order,
    // Mặc định = ẩn Hoàn thành + Đã hủy; 'all' = hiện tất cả (Boss/Admin vẫn thấy việc Hoàn thành chưa xem — server)
    hideCompleted: !s.status && s.view !== 'unseen',
    important: s.view === 'important' || undefined,
    unseenOnly: s.view === 'unseen' || undefined,
    page: s.page,
    limit: s.limit,
  };
}

// ───────────────────────────── Cập nhật URL (giống setter V1) ─────────────────────────────
export type Updates = Record<string, string | undefined>;

/** Áp cập nhật lên chuỗi query: rỗng/undefined = xoá tham số (V1 updateParams). */
export function applyUpdates(current: string, updates: Updates): string {
  const params = new URLSearchParams(current);
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === '') params.delete(k);
    else params.set(k, v);
  }
  return params.toString();
}

export type FilterKey = 'search' | 'status' | 'priorityId' | 'typeId' | 'source' | 'datePreset' | 'dateFrom' | 'dateTo';
/** Giá trị "tất cả" trong ô chọn: 'active' (trạng thái chưa hoàn thành) / 'all' (các ô khác) → bỏ tham số. */
export function filterUpdate(key: FilterKey, value: string): Updates {
  const allKey = key === 'priorityId' || key === 'typeId' || key === 'source' || key === 'datePreset';
  const v = (key === 'status' ? value === 'active' : allKey && value === 'all') ? '' : value;
  if (key === 'datePreset') return { datePreset: v || undefined, dateFrom: undefined, dateTo: undefined, page: undefined };
  if (key === 'dateFrom' || key === 'dateTo') return { [key]: v || undefined, datePreset: undefined, page: undefined };
  return { [key]: v || undefined, page: undefined };
}
export const pageUpdate = (p: number): Updates => ({ page: p > 1 ? String(p) : undefined });
export const limitUpdate = (l: number): Updates => ({ limit: l !== DEFAULT_LIMIT ? String(l) : undefined, page: undefined });
export const sortUpdate = (v: string, tracking: boolean): Updates => ({ sort: v !== defaultSort(tracking) ? v : undefined, page: undefined });

// ───────────────────────────── Tab (client, ánh xạ vào tham số V1) ─────────────────────────────
export type ListTab = 'open' | 'starred' | 'unseen' | 'done' | 'cancelled';

/** ★ + Mới xong chỉ Boss/Admin (V1 TaskTrackingMenu). "Cần tôi xử lý" của preview cần lọc phía server → Phase B. */
export const tabsFor = (tracking: boolean): ListTab[] =>
  tracking ? ['open', 'starred', 'unseen', 'done', 'cancelled'] : ['open', 'done', 'cancelled'];

export function activeTab(s: ListState): ListTab {
  if (s.view === 'important') return 'starred';
  if (s.view === 'unseen') return 'unseen';
  if (s.status === 'COMPLETED') return 'done';
  if (s.status === 'CANCELLED') return 'cancelled';
  return 'open';
}

export function tabUpdate(tab: ListTab): Updates {
  const base: Updates = { view: undefined, status: undefined, page: undefined };
  if (tab === 'starred') return { ...base, view: 'important' };
  if (tab === 'unseen') return { ...base, view: 'unseen' };
  if (tab === 'done') return { ...base, status: 'COMPLETED' };
  if (tab === 'cancelled') return { ...base, status: 'CANCELLED' };
  return base;
}

/** Trạng thái đang được tab thể hiện (Đã xong / Đã hủy) → không tính là bộ lọc. */
const statusIsTab = (s: ListState) => s.view === '' && (s.status === 'COMPLETED' || s.status === 'CANCELLED');
const statusFilterOn = (s: ListState) =>
  s.view !== 'unseen' && !statusIsTab(s) && (s.status === 'all' || validStatus(s.status) !== undefined);

// ───────────────────────────── Chip bộ lọc ─────────────────────────────
export type ChipKey = 'status' | 'priorityId' | 'typeId' | 'source' | 'date';
export type ChipValue = { key: string } | { text: string } | { range: { from: string; to: string } };
export interface FilterChipModel { key: ChipKey; label: string; value: ChipValue }
interface Named { id: string; name: string }

export function filterChips(s: ListState, look: { priorities: Named[]; taskTypes: Named[] }): FilterChipModel[] {
  const out: FilterChipModel[] = [];
  const name = (list: Named[], id: string) => list.find((x) => x.id === id)?.name ?? '…';
  if (statusFilterOn(s)) out.push({ key: 'status', label: 'tl.f.status', value: { key: s.status === 'all' ? 'tlx.f.stAll' : `st.${s.status}` } });
  if (s.priorityId) out.push({ key: 'priorityId', label: 'tl.f.priority', value: { text: name(look.priorities, s.priorityId) } });
  if (s.typeId) out.push({ key: 'typeId', label: 'tl.f.type', value: { text: name(look.taskTypes, s.typeId) } });
  if (validSource(s.source)) out.push({ key: 'source', label: 'tl.f.source', value: { key: `tl.f.src.${s.source}` } });
  if (s.dateFrom || s.dateTo) out.push({ key: 'date', label: 'tl.f.time', value: { range: { from: s.dateFrom, to: s.dateTo } } });
  else if ((DATE_PRESETS as readonly string[]).includes(s.datePreset)) out.push({ key: 'date', label: 'tl.f.time', value: { key: `tl.f.t.${s.datePreset}` } });
  return out;
}

export const filterCount = (s: ListState) => filterChips(s, { priorities: [], taskTypes: [] }).length;

export function chipRemoveUpdate(key: ChipKey): Updates {
  if (key === 'date') return { datePreset: undefined, dateFrom: undefined, dateTo: undefined, page: undefined };
  return { [key]: undefined, page: undefined };
}

/** "Xóa bộ lọc": bỏ mọi điều kiện của bảng lọc; giữ tìm kiếm, tab, sắp xếp, cỡ trang. */
export function clearFiltersUpdate(s: ListState): Updates {
  return {
    ...(statusIsTab(s) ? {} : { status: undefined }),
    priorityId: undefined, typeId: undefined, source: undefined,
    datePreset: undefined, dateFrom: undefined, dateTo: undefined, page: undefined,
  };
}

// ───────────────────────────── Sắp xếp bằng tiêu đề cột ─────────────────────────────
export type AriaSort = 'none' | 'ascending' | 'descending';
/** Cột Hạn / Trạng thái dùng đúng sortField V1: chưa → tăng → giảm → về mặc định. */
export function headerSort(s: ListState, field: 'scheduleEnd' | 'status'): { ariaSort: AriaSort; next: string } {
  const cur = parseSort(s);
  if (cur.smart || cur.field !== field) return { ariaSort: 'none', next: `${field}:asc` };
  if (cur.order === 'asc') return { ariaSort: 'ascending', next: `${field}:desc` };
  return { ariaSort: 'descending', next: defaultSort(s.tracking) };
}

// ───────────────────────────── Menu ⋯ ─────────────────────────────
export type QuickActionKey =
  | 'view' | 'open' | 'copy'
  | 'approve-plan' | 'reject-plan' | 'acknowledge' | 'reject-task' | 'complete' | 'supplement'
  | 'approve-review' | 'reject-review' | 'extension' | 'approve-extension' | 'transfer' | 'restore'
  | 'edit' | 'star'
  | 'cancel';

type Ext = { id: string; status: string; requestedDate: Date | string };

/** Đơn gia hạn đang chờ có ngày xin xa nhất (V1 "Bug 4": Boss duyệt đơn này từ menu thẻ). */
export function latestPendingExtension<E extends Ext>(exts: E[]): E | null {
  const pending = exts.filter((e) => e.status === 'PENDING');
  if (!pending.length) return null;
  return pending.reduce((max, e) => (new Date(e.requestedDate) > new Date(max.requestedDate) ? e : max));
}

/**
 * Nhóm mục menu ⋯ (preview _SPEC §5): [xem] · [nghiệp vụ] · [Sửa, ★] · [Hủy].
 * Mục nghiệp vụ = đúng tập mục của V1 TaskCardMenu (đọc cờ `useTaskPermissions`), xếp theo thứ tự preview.
 */
export function quickMenuKeys(
  p: Pick<TaskPermissions,
    'canApprovePlan' | 'canRejectPlan' | 'canAcknowledge' | 'canRejectTask' | 'canComplete' | 'canSupplementReport'
    | 'canApproveReview' | 'canRejectReview' | 'canRequestExtension' | 'canApproveExtension' | 'canTransfer'
    | 'canRestore' | 'canEdit' | 'canCancel'>,
  o: { canStar: boolean; isImportant: boolean; extensions: Ext[] },
): QuickActionKey[][] {
  const biz: QuickActionKey[] = [];
  if (p.canApprovePlan) biz.push('approve-plan');
  if (p.canRejectPlan) biz.push('reject-plan');
  if (p.canAcknowledge) biz.push('acknowledge');
  if (p.canRejectTask) biz.push('reject-task');
  if (p.canComplete) biz.push('complete');
  if (p.canSupplementReport) biz.push('supplement');
  if (p.canApproveReview) biz.push('approve-review');
  if (p.canRejectReview) biz.push('reject-review');
  if (p.canRequestExtension) biz.push('extension');
  if (p.canApproveExtension && latestPendingExtension(o.extensions)) biz.push('approve-extension');
  if (p.canTransfer) biz.push('transfer');
  if (p.canRestore) biz.push('restore');
  const edit: QuickActionKey[] = [];
  if (p.canEdit) edit.push('edit');
  if (o.canStar) edit.push('star');
  return [['view', 'open', 'copy'], biz, edit, p.canCancel ? ['cancel'] : []];
}

/** Mã hiển thị (V1 thẻ): việc Helpdesk → HD-{hdCode}; còn lại taskCode. */
export function displayCode(t: { taskCode: string | null; hdNguonNhap: string | null; hdCode: string | null }): string {
  if (t.hdNguonNhap === 'helpdesk' && t.hdCode) return `HD-${t.hdCode}`;
  return t.taskCode ?? '—';
}

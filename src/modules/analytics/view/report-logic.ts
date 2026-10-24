/**
 * Báo cáo V2 (A3-5) — hàm thuần: kỳ báo cáo theo giờ VN, đọc/ghi URL, URL gọi API/xuất tệp, ô KPI, lọc Research.
 * Mọi URL/công thức đối chiếu V1 trong `__tests__/v1-report.fixture.ts`. Không đổi API/query.
 * Ngày dạng 'YYYY-MM-DD'; tính bằng UTC thuần trên chuỗi để không lệch múi giờ máy chạy.
 */
import { APP_TIMEZONE } from '@/i18n/format';
import { intlLocale, type Locale } from '@/i18n/locale';

export interface Range { dateFrom: string; dateTo: string }
export type OvPreset = 'month' | 'quarter' | 'custom';
export type TlPreset = 'month' | 'year' | 'custom';
export type DrillType = 'overdue' | 'in_progress' | 'pending_review' | 'completed' | 'total';
export type Period =
  | { kind: 'month'; y: number; m: number }
  | { kind: 'quarter'; y: number; q: number }
  | { kind: 'year'; y: number }
  | { kind: 'range'; a: string; b: string }
  | { kind: 'all' };

/** Năm đầu tiên có trong bộ chọn (V1: YEAR_OPTIONS từ 2025). */
export const FIRST_YEAR = 2025;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const parts = (s: string) => s.split('-').map(Number) as [number, number, number];
const toUtc = (s: string) => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d); };
const fromUtc = (t: number) => { const d = new Date(t); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); };
const DAY = 86_400_000;

/** Hôm nay theo giờ app (Asia/Bangkok = giờ VN). */
export function todayISO(now: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const yearOf = (d: string) => parts(d)[0];

export function monthRange(y: number, m: number): Range { return { dateFrom: iso(y, m, 1), dateTo: iso(y, m, lastDay(y, m)) }; }
export function quarterRange(y: number, q: number): Range { const m0 = (q - 1) * 3 + 1; return { dateFrom: iso(y, m0, 1), dateTo: iso(y, m0 + 2, lastDay(y, m0 + 2)) }; }
export function yearRange(y: number): Range { return { dateFrom: iso(y, 1, 1), dateTo: iso(y, 12, 31) }; }

/** V1 DateRangeFilter.getPresetRange: Tháng / Quý = tháng / quý hiện tại. */
export function presetRange(preset: 'month' | 'quarter', today: string): Range {
  const [y, m] = parts(today);
  return preset === 'month' ? monthRange(y, m) : quarterRange(y, Math.floor((m - 1) / 3) + 1);
}

/** V1 (analytics/page.tsx): kỳ trước = lùi đúng số ngày của kỳ đang xem. */
export function prevRange(r: Range): Range | undefined {
  if (!r.dateFrom || !r.dateTo) return undefined;
  const from = toUtc(r.dateFrom);
  const duration = Math.round((toUtc(r.dateTo) - from) / DAY) + 1;
  return { dateFrom: fromUtc(from - duration * DAY), dateTo: fromUtc(from - DAY) };
}

/** Khoảng ngày → kiểu kỳ (để hiện nhãn + chọn đúng nút). */
export function inferPeriod(r: Range): Period {
  if (!r.dateFrom || !r.dateTo) return { kind: 'all' };
  const [y, m, d] = parts(r.dateFrom);
  const [y2, m2, d2] = parts(r.dateTo);
  if (d === 1 && y === y2 && d2 === lastDay(y2, m2)) {
    if (m === m2) return { kind: 'month', y, m };
    if (m === 1 && m2 === 12) return { kind: 'year', y };
    if ((m - 1) % 3 === 0 && m2 === m + 2) return { kind: 'quarter', y, q: (m - 1) / 3 + 1 };
  }
  return { kind: 'range', a: r.dateFrom, b: r.dateTo };
}

export function monthOptions(today: string): { y: number; m: number }[] {
  const [ty, tm] = parts(today);
  const out: { y: number; m: number }[] = [];
  for (let y = ty; y >= FIRST_YEAR; y--) for (let m = y === ty ? tm : 12; m >= 1; m--) out.push({ y, m });
  return out;
}
export function quarterOptions(today: string): { y: number; q: number }[] {
  const [ty, tm] = parts(today);
  const out: { y: number; q: number }[] = [];
  for (let y = ty; y >= FIRST_YEAR; y--) for (let q = y === ty ? Math.ceil(tm / 3) : 4; q >= 1; q--) out.push({ y, q });
  return out;
}
/** V1 YEAR_OPTIONS: 2025 → năm hiện tại (V2 hiện năm mới trước). */
export function yearOptions(today: string): number[] {
  const out: number[] = [];
  for (let y = yearOf(today); y >= FIRST_YEAR; y--) out.push(y);
  return out;
}

/** Sửa một đầu mút của khoảng tuỳ chọn; `invalid` khi bắt đầu > kết thúc (V2 báo lỗi, không gọi API). */
export function rangeToggle(r: Range, key: keyof Range, value: string): { range: Range; invalid: boolean } {
  const range = { ...r, [key]: value };
  return { range, invalid: !!(range.dateFrom && range.dateTo && range.dateFrom > range.dateTo) };
}

type Getter = { get(k: string): string | null };

// ─── Tổng quan ────────────────────────────────────────────────────────────────

export interface OverviewState { range: Range; preset: OvPreset; year: number }

/** V1: dateFrom/dateTo (mặc định tháng hiện tại), preset (mặc định 'month'), year (mặc định năm hiện tại). */
export function parseOverview(sp: Getter, today: string): OverviewState {
  const def = presetRange('month', today);
  return {
    range: { dateFrom: sp.get('dateFrom') ?? def.dateFrom, dateTo: sp.get('dateTo') ?? def.dateTo },
    preset: (sp.get('preset') as OvPreset) ?? 'month',
    year: Number(sp.get('year') ?? yearOf(today)),
  };
}

/** Ghi thay đổi vào query string hiện tại (V1 updateParams: set từng khoá). V2 ghi preset + khoảng ngày cùng lúc. */
export function overviewUpdate(cur: URLSearchParams, u: { preset?: OvPreset; range?: Range; year?: number }): string {
  const p = new URLSearchParams(cur.toString());
  if (u.preset) p.set('preset', u.preset);
  if (u.range) { p.set('dateFrom', u.range.dateFrom); p.set('dateTo', u.range.dateTo); }
  if (u.year !== undefined) p.set('year', String(u.year));
  return p.toString();
}

/** Nút kỳ đang chọn: 'custom' theo URL, còn lại theo hình dạng khoảng ngày (V1 luôn tô "Tháng" khi mở trang). */
export function overviewDisplayPreset(s: OverviewState): OvPreset {
  if (s.preset === 'custom') return 'custom';
  const p = inferPeriod(s.range);
  return p.kind === 'month' || p.kind === 'quarter' ? p.kind : 'custom';
}

/** V1 excelUrl */
export function excelHref(r: Range, preset: string): string {
  const p = new URLSearchParams({ format: 'xlsx' });
  if (r.dateFrom) p.set('dateFrom', r.dateFrom);
  if (r.dateTo) p.set('dateTo', r.dateTo);
  p.set('preset', preset);
  return `/api/analytics/export?${p}`;
}

/** V1 useKpiOverview/useUserPerformance/…: chỉ gửi khoá có giá trị. */
export function apiDateQuery(r: Partial<Range>): string {
  const p = new URLSearchParams();
  if (r.dateFrom) p.set('dateFrom', r.dateFrom);
  if (r.dateTo) p.set('dateTo', r.dateTo);
  return p.toString();
}

export function drillHref(type: DrillType, r: Range): string {
  const p = new URLSearchParams({ type });
  if (r.dateFrom) p.set('dateFrom', r.dateFrom);
  if (r.dateTo) p.set('dateTo', r.dateTo);
  return `/api/analytics/drilldown?${p}`;
}

/** V1 PerformanceTable.drillDownUrl */
export function perfHref(userId: string, r: Range): string {
  const p = new URLSearchParams({ userId });
  if (r.dateFrom) p.set('dateFrom', r.dateFrom);
  if (r.dateTo) p.set('dateTo', r.dateTo);
  return `/analytics/task-list?${p}`;
}
export const completionPct = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);

/** V1 useExportPdf.getPeriodFilename */
export function pdfFileTag(r: Range, preset: string): string {
  if (preset === 'month' && r.dateFrom) { const [y, m] = parts(r.dateFrom); return `Thang-${m}-${y}`; }
  if (preset === 'quarter' && r.dateFrom) { const [y, m] = parts(r.dateFrom); return `Quy-${Math.floor((m - 1) / 3) + 1}-${y}`; }
  if (preset === 'year' && r.dateFrom) return `Nam-${yearOf(r.dateFrom)}`;
  if (r.dateFrom && r.dateTo) return `${ddmmyyyy(r.dateFrom)}-${ddmmyyyy(r.dateTo)}`;
  return 'toan-bo';
}
const ddmmyyyy = (s: string) => { const [y, m, d] = parts(s); return `${pad(d)}${pad(m)}${y}`; };

// ─── KPI ──────────────────────────────────────────────────────────────────────

export interface KpiInput {
  totalTasksCreated: number; totalCompleted: number; totalOverdue: number; extensionCount: number; extensionRate: number;
  tasksByStatus: Record<string, number>;
}
export type KpiKey = 'total' | 'done' | 'prog' | 'wait' | 'over' | 'ext';
export interface KpiCardVm {
  key: KpiKey;
  value: number;
  /** V1: hiện khi có kỳ trước và ≠ 0; tăng xanh, giảm đỏ (mọi ô) */
  delta?: number;
  prev?: number;
  drill: DrillType | null;
  /** Tỉ lệ hoàn thành, 1 chữ số lẻ (V1 toFixed(1)) */
  rate?: number;
  waitAck?: number;
  waitReview?: number;
  warn?: boolean;
  extRate?: number;
}

const waitOf = (k: KpiInput) => (k.tasksByStatus['PENDING_REVIEW'] ?? 0) + (k.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0);

/** 6 ô KPI V1 (analytics/page.tsx). Giống nhau cho mọi vai trò có menu Báo cáo. */
export function kpiCards(k: KpiInput, p?: KpiInput): KpiCardVm[] {
  const mk = (key: KpiKey, value: number, prev: number | undefined, drill: DrillType | null, extra: Partial<KpiCardVm> = {}): KpiCardVm =>
    ({ key, value, prev, delta: prev === undefined ? undefined : value - prev, drill, ...extra });
  return [
    mk('total', k.totalTasksCreated, p?.totalTasksCreated, 'total'),
    mk('done', k.totalCompleted, p?.totalCompleted, 'completed', {
      rate: k.totalTasksCreated > 0 ? parseFloat((k.totalCompleted / k.totalTasksCreated * 100).toFixed(1)) : 0,
    }),
    mk('prog', k.tasksByStatus['IN_PROGRESS'] ?? 0, p ? p.tasksByStatus['IN_PROGRESS'] ?? 0 : undefined, 'in_progress'),
    mk('wait', waitOf(k), p ? waitOf(p) : undefined, 'pending_review', {
      waitAck: k.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0, waitReview: k.tasksByStatus['PENDING_REVIEW'] ?? 0,
    }),
    mk('over', k.totalOverdue, p?.totalOverdue, 'overdue'),
    mk('ext', k.extensionCount, p?.extensionCount, null, { warn: k.extensionRate > 20, extRate: k.extensionRate }),
  ];
}

/** Số phần trăm (giá trị 0..100) theo ngôn ngữ: vi `54,1%`, en `54.1%`. */
export function pctText(v: number, locale: Locale, maxDigits = 0, minDigits = 0): string {
  return `${new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: maxDigits, minimumFractionDigits: minDigits }).format(v)}%`;
}

// ─── Danh sách công việc ─────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';
export interface TaskListState {
  range: Range; preset: TlPreset; userId: string; search: string; sortBy: string; sortOrder: SortOrder; page: number; pageSize: number;
}

/** V1 task-list/page.tsx đọc URL. */
export function parseTaskList(sp: Getter, today: string): TaskListState {
  const def = presetRange('month', today);
  return {
    range: { dateFrom: sp.get('dateFrom') ?? def.dateFrom, dateTo: sp.get('dateTo') ?? def.dateTo },
    preset: (sp.get('preset') as TlPreset) ?? 'month',
    userId: sp.get('userId') ?? '',
    search: sp.get('search') ?? '',
    sortBy: sp.get('sortBy') ?? 'createdAt',
    sortOrder: (sp.get('sortOrder') as SortOrder) ?? 'desc',
    page: Math.max(1, Number(sp.get('page') ?? 1)),
    pageSize: Number(sp.get('pageSize') ?? 20),
  };
}

/** V1 useTaskList: thứ tự khoá dateFrom, dateTo, userId, search, sortBy, sortOrder, page, pageSize; bỏ rỗng. */
export function taskListApiUrl(s: TaskListState): string {
  const p = new URLSearchParams();
  const add = (k: string, v: string | number | undefined) => { if (v !== undefined && v !== '') p.set(k, String(v)); };
  add('dateFrom', s.range.dateFrom); add('dateTo', s.range.dateTo); add('userId', s.userId); add('search', s.search);
  add('sortBy', s.sortBy); add('sortOrder', s.sortOrder); add('page', s.page); add('pageSize', s.pageSize);
  return `/api/analytics/task-list?${p}`;
}

/** V1 buildPeriodLabel (tham số `period` của Xuất Excel). */
export function tlFileTag(s: Pick<TaskListState, 'range' | 'preset'>): string {
  const { dateFrom, dateTo } = s.range;
  if (s.preset === 'month' && dateFrom) { const [y, m] = parts(dateFrom); return `Thang-${m}-${y}`; }
  if (s.preset === 'year' && dateFrom) return `Nam-${yearOf(dateFrom)}`;
  if (dateFrom && dateTo) return `${ddmmyyyy(dateFrom)}-${ddmmyyyy(dateTo)}`;
  return 'tat-ca';
}

/** V1 excelExportUrl */
export function taskListExcelHref(s: TaskListState): string {
  const p = new URLSearchParams();
  if (s.range.dateFrom) p.set('dateFrom', s.range.dateFrom);
  if (s.range.dateTo) p.set('dateTo', s.range.dateTo);
  if (s.userId) p.set('userId', s.userId);
  p.set('period', tlFileTag(s));
  return `/api/analytics/task-list/export?${p}`;
}

/** V1 TaskListFilter.buildRange: tháng 0 = "Tất cả tháng" → cả năm. */
export function tlRange(month: number, year: number): { preset: TlPreset; range: Range } {
  return month === 0 ? { preset: 'year', range: yearRange(year) } : { preset: 'month', range: monthRange(year, month) };
}

/** Nút kỳ đang chọn ở Danh sách: 'custom' theo URL; link từ Tổng quan (không có preset) theo hình dạng khoảng ngày. */
export function tlDisplayPreset(s: Pick<TaskListState, 'range' | 'preset'>): TlPreset {
  if (s.preset === 'custom') return 'custom';
  const p = inferPeriod(s.range);
  return p.kind === 'month' || p.kind === 'year' ? p.kind : 'custom';
}

/** V1 handleSort */
export function nextSort(sortBy: string, sortOrder: SortOrder, field: string): { sortBy: string; sortOrder: SortOrder } {
  return { sortBy: field, sortOrder: sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc' };
}

/** V1: các lựa chọn sắp xếp (select "Mới nhất"…). Nhãn: rp.l.sort.* */
export const TL_SORTS = [
  { v: 'createdAt-desc', k: 'rp.l.sort.crD' }, { v: 'createdAt-asc', k: 'rp.l.sort.crA' },
  { v: 'scheduleEnd-asc', k: 'rp.l.sort.dueA' }, { v: 'scheduleEnd-desc', k: 'rp.l.sort.dueD' },
  { v: 'title-asc', k: 'rp.l.sort.title' }, { v: 'title-desc', k: 'rpx.sort.titleD' },
  { v: 'status-asc', k: 'rp.l.sort.st' },
] as const;

/** Ghi thay đổi (V1 updateParams ở Danh sách: rỗng thì xoá khoá). */
export function taskListUpdate(cur: URLSearchParams, updates: Record<string, string>): string {
  const p = new URLSearchParams(cur.toString());
  Object.entries(updates).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
  return p.toString();
}

// ─── Research ─────────────────────────────────────────────────────────────────

/** V1 research/page.tsx: tìm theo tiêu đề / tên người làm, quá hạn ≥ N ngày. */
export function filterOverdue<T extends { title: string; daysOverdue: number; assignees: { user: { displayName: string } }[] }>(
  list: T[], search: string, minDays: string,
): T[] {
  let items = list;
  const q = search.trim().toLowerCase();
  if (q) items = items.filter((t) => t.title.toLowerCase().includes(q) || t.assignees.some((a) => a.user.displayName.toLowerCase().includes(q)));
  if (minDays && Number(minDays) > 0) items = items.filter((t) => t.daysOverdue >= Number(minDays));
  return items;
}

// ─── Tab con ─────────────────────────────────────────────────────────────────

export interface ReportTab { key: 'overview' | 'tasks' | 'research'; href: string; on: boolean }
/**
 * V1: menu con Báo cáo có "Tổng quan" (ai có menu) + "Danh sách công việc" (chỉ Boss/Admin); `/analytics/research`
 * không có link nào. V2 giữ y vậy, chỉ hiện tab của trang đang mở nếu người dùng vào bằng URL.
 */
export function reportTabs(privileged: boolean, path: string): ReportTab[] {
  const onTasks = path.startsWith('/analytics/task-list');
  const onResearch = path.startsWith('/analytics/research');
  const tabs: ReportTab[] = [{ key: 'overview', href: '/analytics', on: !onTasks && !onResearch }];
  if (privileged || onTasks) tabs.push({ key: 'tasks', href: '/analytics/task-list', on: onTasks });
  if (onResearch) tabs.push({ key: 'research', href: '/analytics/research', on: true });
  return tabs;
}

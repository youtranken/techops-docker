/**
 * Logic thuần của trang Helpdesk V2 (A3-3). Mọi URL / body gửi server giữ nguyên V1 —
 * đối chiếu bằng `__tests__/v1-helpdesk.fixture.ts` (bản sao logic V1).
 */
import type { CronConfig, HelpdeskPendingItem, PendingFilters } from '../../types';
import { isCompletedTrangThai } from '../../config/ticket-status';
import { formatDate, APP_TIMEZONE } from '@/i18n/format';
import type { Locale } from '@/i18n/locale';

const BASE = '/api/integrations/helpdesk/unassigned';

/* ---------- Bộ lọc + phân trang (state cục bộ như V1, không ghi URL trình duyệt) ---------- */
export const INITIAL_FILTERS: PendingFilters = { limit: 25 };
export const HD_PAGE_SIZES = [10, 25, 50, 100] as const;

export type FilterKey = 'search' | 'uuTien' | 'trangThai' | 'itSupport' | 'dateFrom' | 'dateTo';
/** 5 ô của hộp lọc (ô tìm kiếm nằm trên thanh công cụ) */
export const FORM_KEYS = ['uuTien', 'trangThai', 'itSupport', 'dateFrom', 'dateTo'] as const;
export type FormKey = (typeof FORM_KEYS)[number];
export type FilterForm = Record<FormKey, string>;
/** Giá trị đặc biệt V1 cho "Chưa có IT Support" */
export const IT_NONE = '__none__';

function filterParams(f: PendingFilters | undefined): URLSearchParams {
  const p = new URLSearchParams();
  for (const k of ['search', 'uuTien', 'trangThai', 'itSupport', 'dateFrom', 'dateTo'] as const) {
    const v = f?.[k];
    if (v) p.set(k, v);
  }
  return p;
}

/** URL lấy danh sách (thứ tự tham số như fetchPending V1) */
export function pendingUrl(f?: PendingFilters): string {
  const p = filterParams(f);
  if (f?.page) p.set('page', String(f.page));
  if (f?.limit) p.set('limit', String(f.limit));
  return `${BASE}?${p}`;
}

/** URL xuất Excel (V1: cùng bộ lọc, không phân trang) */
export function exportUrl(f: PendingFilters): string {
  const p = filterParams(f);
  p.set('export', 'xlsx');
  return `${BASE}?${p}`;
}

export function setFilter(prev: PendingFilters, key: FilterKey, value: string): PendingFilters {
  return { ...prev, [key]: value || undefined, page: undefined };
}

export function applyFilterForm(prev: PendingFilters, form: FilterForm): PendingFilters {
  return FORM_KEYS.reduce((acc, k) => setFilter(acc, k, form[k]), prev);
}

export function filterFormFrom(f: PendingFilters): FilterForm {
  return { uuTien: f.uuTien ?? '', trangThai: f.trangThai ?? '', itSupport: f.itSupport ?? '', dateFrom: f.dateFrom ?? '', dateTo: f.dateTo ?? '' };
}

/** "Xoá bộ lọc" cạnh chip: bỏ 5 ô của hộp lọc, GIỮ ô tìm kiếm + cỡ trang (V1 bỏ cả ô tìm vì nút nằm chung hàng với ô tìm) */
export function clearForm(prev: PendingFilters): PendingFilters {
  return applyFilterForm(prev, { uuTien: '', trangThai: '', itSupport: '', dateFrom: '', dateTo: '' });
}

export function hasActiveFilter(f: PendingFilters): boolean {
  return Object.keys(f).some((k) => k !== 'page' && k !== 'limit' && f[k as keyof PendingFilters]);
}

export function chipKeys(f: PendingFilters): FormKey[] {
  return FORM_KEYS.filter((k) => !!f[k]);
}

export const pageTo = (prev: PendingFilters, page: number): PendingFilters => ({ ...prev, page });
export const pageSizeTo = (prev: PendingFilters, limit: number): PendingFilters => ({ ...prev, limit, page: undefined });

/* ---------- Hiển thị ---------- */
export type HdStatusKey = 'done' | 'progress' | 'pending' | 'approved' | 'rejected' | 'closed';
export type HdPriorityKey = 'urgent' | 'high' | 'normal' | 'low';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

const STATUS_WORDS: Record<string, HdStatusKey> = {
  completed: 'done', 'hoan thanh': 'done', done: 'done',
  'in progress': 'progress', 'dang xu ly': 'progress', processing: 'progress',
  pending: 'pending', 'cho xu ly': 'pending', open: 'pending', new: 'pending', moi: 'pending',
  approved: 'approved', 'da duyet': 'approved',
  rejected: 'rejected', 'tu choi': 'rejected',
  closed: 'closed', 'da dong': 'closed', cancelled: 'closed', canceled: 'closed', 'da huy': 'closed',
};
/** Trạng thái gốc từ Helpdesk (chuỗi Anh hoặc Việt) → khoá màu/nhãn; lạ → null (hiện nguyên văn) */
export function hdStatusKey(raw: string | null | undefined): HdStatusKey | null {
  return raw ? STATUS_WORDS[fold(raw)] ?? null : null;
}

const PRIORITY_WORDS: Record<string, HdPriorityKey> = {
  'khan cap': 'urgent', urgent: 'urgent', cao: 'high', high: 'high',
  'binh thuong': 'normal', normal: 'normal', medium: 'normal', 'trung binh': 'normal', thap: 'low', low: 'low',
};
export function hdPriorityKey(raw: string | null | undefined): HdPriorityKey | null {
  return raw ? PRIORITY_WORDS[fold(raw)] ?? null : null;
}

export interface RowFlags { pushed: boolean; completed: boolean; attention: boolean; selectable: boolean }
/** Như HelpdeskTicketRow V1: PUSHED = đã tạo việc; cần chú ý = đã hoàn thành, chưa có IT Support, chưa tạo việc */
export function rowFlags(it: HelpdeskPendingItem): RowFlags {
  const pushed = it.status === 'PUSHED';
  const completed = isCompletedTrangThai(it.trangThai);
  return { pushed, completed, attention: completed && !it.itSupport && it.status === 'UNASSIGNED', selectable: !pushed };
}

/** Lựa chọn cho ô "Trạng thái" của hộp lọc: giá trị gốc (gửi server như V1), nhãn dịch; trùng nhãn thì kèm giá trị gốc */
export function statusOptions(values: string[], label: (raw: string) => string): { value: string; label: string }[] {
  const labels = values.map(label);
  return values.map((value, i) => ({
    value,
    label: labels.filter((l) => l === labels[i]).length > 1 ? `${labels[i]} (${value})` : labels[i],
  }));
}

/** Ngày giờ ở múi giờ app: vi "22/10/2026 08:12", en "Oct 22, 2026 08:12"; rỗng/sai → '' */
export function fmtDateTime(v: string | Date | null | undefined, locale: Locale): string {
  const day = formatDate(v ?? null, locale);
  if (!day) return '';
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(v as string));
  return `${day} ${time}`;
}

/* ---------- Chọn nhiều (giữ qua các trang như V1) ---------- */
export const selectableIds = (rows: HelpdeskPendingItem[]) => rows.filter((r) => r.status !== 'PUSHED').map((r) => r.id);

export function headerCheck(sel: Set<string>, rows: HelpdeskPendingItem[]): 'none' | 'some' | 'all' | 'disabled' {
  const ids = selectableIds(rows);
  if (!ids.length) return 'disabled';
  const n = ids.filter((id) => sel.has(id)).length;
  return n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
}

export function toggleAllOnPage(sel: Set<string>, rows: HelpdeskPendingItem[], on: boolean): Set<string> {
  const next = new Set(sel);
  for (const id of selectableIds(rows)) { if (on) next.add(id); else next.delete(id); }
  return next;
}

export function toggleOne(sel: Set<string>, id: string): Set<string> {
  const next = new Set(sel);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

/** Số yêu cầu thất bại khi gán/xoá hàng loạt. V1 chỉ đếm lỗi mạng (HTTP 4xx/5xx bị coi là thành công) — V2 đếm cả HTTP lỗi. */
export function countBulkFailures(results: PromiseSettledResult<{ ok: boolean; status: number }>[]): number {
  return results.filter((r) => r.status === 'rejected' || (!r.value.ok && r.value.status !== 204)).length;
}

/* ---------- Lịch tự động (CronPanel V1: 2 khung giờ) ---------- */
export interface CronForm { e1: boolean; t1: string; e2: boolean; t2: string }
type CronBody = Pick<CronConfig, 'enabled' | 'hour' | 'minute' | 'enabled2' | 'hour2' | 'minute2'>;
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
/** Mặc định CronPanel V1 khi chưa tải cấu hình */
const CRON_DEFAULT: CronBody = { enabled: true, hour: 7, minute: 0, enabled2: false, hour2: 12, minute2: 0 };

export function cronFormFrom(c: CronConfig | undefined): CronForm {
  const s = c ?? CRON_DEFAULT;
  return { e1: s.enabled, t1: hhmm(s.hour, s.minute), e2: s.enabled2, t2: hhmm(s.hour2, s.minute2) };
}

function parseTime(t: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  return [Math.min(23, Math.max(0, Number(m[1]))), Math.min(59, Math.max(0, Number(m[2])))];
}

/** Body POST cron-config: đúng 6 trường như V1. Ô giờ trống (chỉ có thể ở khung đang tắt) → giữ giờ cũ. */
export function cronPayload(f: CronForm, prev?: CronConfig): CronBody {
  const base = prev ?? CRON_DEFAULT;
  const [hour, minute] = parseTime(f.t1) ?? [base.hour, base.minute];
  const [hour2, minute2] = parseTime(f.t2) ?? [base.hour2, base.minute2];
  return { enabled: f.e1, hour, minute, enabled2: f.e2, hour2, minute2 };
}

export function cronErrors(f: CronForm): { t1?: 'empty'; t2?: 'empty' } {
  const e: { t1?: 'empty'; t2?: 'empty' } = {};
  if (f.e1 && !parseTime(f.t1)) e.t1 = 'empty';
  if (f.e2 && !parseTime(f.t2)) e.t2 = 'empty';
  return e;
}

export function cronTimes(c: CronConfig | undefined): string[] {
  if (!c) return [];
  const out: string[] = [];
  if (c.enabled) out.push(hhmm(c.hour, c.minute));
  if (c.enabled2) out.push(hhmm(c.hour2, c.minute2));
  return out;
}

/* ---------- Nhập dữ liệu JSON (ManualImportCard V1) ---------- */
export type ImportBody = { manualData: unknown };
/** Yêu cầu POST /sync như V1: không body = "Get từ API" (chỉ method), có body = nhập JSON */
export function syncInit(body?: ImportBody): RequestInit {
  return body === undefined
    ? { method: 'POST' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
export type ImportParse = { ok: true; body: ImportBody } | { ok: false; error: 'empty' | 'json' };
/** V1: rỗng → không gửi; JSON lỗi → không gửi; còn lại gửi nguyên { manualData } (server tự kiểm dạng + giới hạn 500) */
export function parseImport(text: string): ImportParse {
  if (!text.trim()) return { ok: false, error: 'empty' };
  try { return { ok: true, body: { manualData: JSON.parse(text) } }; } catch { return { ok: false, error: 'json' }; }
}

/* ---------- Đặt lại dữ liệu (OTP, chỉ ADMIN) ---------- */
export const sanitizeOtp = (v: string) => v.replace(/\D/g, '').slice(0, 6);
export const otpReady = (v: string) => v.length === 6;
export const resetUrl = (otp: string) => `/api/integrations/helpdesk/reset?otp=${encodeURIComponent(otp)}`;

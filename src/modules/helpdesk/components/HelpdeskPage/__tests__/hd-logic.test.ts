import { describe, it, expect } from 'vitest';
import type { HelpdeskPendingItem, PendingFilters, CronConfig } from '../../../types';
import {
  INITIAL_FILTERS, HD_PAGE_SIZES, pendingUrl, exportUrl, setFilter, applyFilterForm, clearForm, hasActiveFilter,
  chipKeys, pageTo, pageSizeTo, hdStatusKey, hdPriorityKey, rowFlags, selectableIds, headerCheck, toggleAllOnPage,
  toggleOne, countBulkFailures, cronFormFrom, cronPayload, cronErrors, cronTimes, parseImport, sanitizeOtp, otpReady,
  resetUrl, statusOptions, fmtDateTime, filterFormFrom, syncInit,
} from '../hd-logic';
import {
  v1PendingUrl, v1ExportUrl, V1_INITIAL_FILTERS, v1SetFilter, v1ClearFilters, v1HasActiveFilter, v1PageChange,
  v1PageSizeChange, v1CronBody, V1_CRON_DEFAULT, v1ImportBody, v1SanitizeOtp, v1ResetUrl, v1RowFlags,
} from './v1-helpdesk.fixture';

const FILTER_CASES: PendingFilters[] = [
  {},
  { limit: 25 },
  { limit: 25, page: 3 },
  { search: 'máy in', limit: 50 },
  { uuTien: 'Khẩn cấp', trangThai: 'Hoàn thành', itSupport: '__none__', limit: 10, page: 2 },
  { itSupport: 'Le Minh', dateFrom: '2026-10-01', dateTo: '2026-10-22', limit: 100 },
  { search: 'a&b=c?', dateTo: '2026-01-31', limit: 25 },
];

function item(p: Partial<HelpdeskPendingItem> = {}): HelpdeskPendingItem {
  return {
    id: 'id1', hdId: '260851', tieuDe: 'VPN', dienGiai: '', uuTien: 'Cao', loaiYeuCau: 'Mạng', nhanVien: 'Lan', phongBan: 'KT',
    thoiGian: '2026-10-22T01:12:00.000Z', trangThai: 'Pending', itSupport: null, ngayHoanThanh: null, status: 'UNASSIGNED',
    createdAt: '2026-10-22T05:00:00.000Z', updatedAt: '2026-10-22T05:00:00.000Z', ...p,
  };
}

describe('URL danh sách / xuất Excel — giống hệt V1', () => {
  it.each(FILTER_CASES)('pendingUrl(%o)', (f) => expect(pendingUrl(f)).toBe(v1PendingUrl(f)));
  it.each(FILTER_CASES)('exportUrl(%o)', (f) => expect(exportUrl(f)).toBe(v1ExportUrl(f)));
  it('bộ lọc ban đầu = V1 (25/trang), cỡ trang 10/25/50/100', () => {
    expect(INITIAL_FILTERS).toEqual(V1_INITIAL_FILTERS);
    expect([...HD_PAGE_SIZES]).toEqual([10, 25, 50, 100]);
  });
});

describe('trạng thái bộ lọc — giống V1', () => {
  const prev: PendingFilters = { search: 'x', uuTien: 'Cao', limit: 50, page: 4 };
  it('setFilter về trang 1, giá trị rỗng = bỏ', () => {
    expect(setFilter(prev, 'trangThai', 'Completed')).toEqual(v1SetFilter(prev, 'trangThai', 'Completed'));
    expect(setFilter(prev, 'uuTien', '')).toEqual(v1SetFilter(prev, 'uuTien', ''));
  });
  it('applyFilterForm = áp lần lượt setFilter cho 5 ô của hộp lọc', () => {
    const form = { uuTien: '', trangThai: 'Closed', itSupport: '__none__', dateFrom: '2026-10-01', dateTo: '' };
    let v1 = prev;
    for (const k of ['uuTien', 'trangThai', 'itSupport', 'dateFrom', 'dateTo'] as const) v1 = v1SetFilter(v1, k, form[k]);
    expect(applyFilterForm(prev, form)).toEqual(v1);
  });
  it('filterFormFrom đọc lại giá trị đang áp', () => {
    expect(filterFormFrom({ uuTien: 'Cao', dateTo: '2026-10-02', limit: 25 }))
      .toEqual({ uuTien: 'Cao', trangThai: '', itSupport: '', dateFrom: '', dateTo: '2026-10-02' });
  });
  it('clearForm: bỏ các ô hộp lọc, giữ tìm kiếm + cỡ trang; không còn ô tìm thì giống hệt V1 clearFilters', () => {
    expect(clearForm(prev)).toEqual({ search: 'x', limit: 50, uuTien: undefined, trangThai: undefined, itSupport: undefined, dateFrom: undefined, dateTo: undefined, page: undefined });
    const noSearch: PendingFilters = { uuTien: 'Cao', itSupport: '__none__', limit: 10, page: 3 };
    expect(hasActiveFilter(clearForm(noSearch))).toBe(false);
    expect(pendingUrl(clearForm(noSearch))).toBe(v1PendingUrl(v1ClearFilters(noSearch)));
  });
  it.each(FILTER_CASES)('hasActiveFilter(%o)', (f) => expect(hasActiveFilter(f)).toBe(v1HasActiveFilter(f)));
  it('chip: chỉ các ô của hộp lọc (ô tìm kiếm nằm riêng)', () => {
    expect(chipKeys({ search: 'x', itSupport: '__none__', dateFrom: '2026-10-01', limit: 25 })).toEqual(['itSupport', 'dateFrom']);
  });
  it('phân trang', () => {
    expect(pageTo(prev, 2)).toEqual(v1PageChange(prev, 2));
    expect(pageSizeTo(prev, 100)).toEqual(v1PageSizeChange(prev, 100));
  });
});

describe('hiển thị dòng', () => {
  it('khoá trạng thái Helpdesk (Anh/Việt)', () => {
    expect(hdStatusKey('Completed')).toBe('done');
    expect(hdStatusKey('Hoàn thành')).toBe('done');
    expect(hdStatusKey('In Progress')).toBe('progress');
    expect(hdStatusKey('Đang xử lý')).toBe('progress');
    expect(hdStatusKey('Pending')).toBe('pending');
    expect(hdStatusKey('Chờ xử lý')).toBe('pending');
    expect(hdStatusKey('Approved')).toBe('approved');
    expect(hdStatusKey('Rejected')).toBe('rejected');
    expect(hdStatusKey('Từ chối')).toBe('rejected');
    expect(hdStatusKey('Closed')).toBe('closed');
    expect(hdStatusKey('Cancelled')).toBe('closed');
    expect(hdStatusKey('Lạ')).toBeNull();
  });
  it('mức ưu tiên', () => {
    expect(hdPriorityKey('Khẩn cấp')).toBe('urgent');
    expect(hdPriorityKey('Cao')).toBe('high');
    expect(hdPriorityKey('Bình thường')).toBe('normal');
    expect(hdPriorityKey('Thấp')).toBe('low');
    expect(hdPriorityKey('Urgent')).toBe('urgent');
    expect(hdPriorityKey('?')).toBeNull();
  });
  it('cờ dòng = V1 (đã tạo việc / cần chú ý / chọn được)', () => {
    const cases = [
      item(), item({ status: 'PUSHED', trangThai: 'Completed', itSupport: 'A' }),
      item({ trangThai: 'Completed' }), item({ trangThai: 'Hoàn thành', itSupport: 'Le Minh' }),
      item({ trangThai: 'Hoàn thành', status: 'PUSHED' }),
    ];
    for (const c of cases) {
      const v1 = v1RowFlags(c);
      expect(rowFlags(c)).toEqual({ pushed: v1.isPushed, completed: v1.isCompleted, attention: v1.isNeedsAttention, selectable: v1.selectable });
    }
  });
  it('statusOptions: nhãn dịch, trùng nhãn thì kèm giá trị gốc', () => {
    const lab = (raw: string) => ({ done: 'Hoàn thành', closed: 'Đã đóng' } as Record<string, string>)[hdStatusKey(raw) ?? ''] ?? raw;
    expect(statusOptions(['Completed', 'Hoàn thành', 'Closed', 'Lạ'], lab)).toEqual([
      { value: 'Completed', label: 'Hoàn thành (Completed)' },
      { value: 'Hoàn thành', label: 'Hoàn thành (Hoàn thành)' },
      { value: 'Closed', label: 'Đã đóng' },
      { value: 'Lạ', label: 'Lạ' },
    ]);
  });
  it('fmtDateTime theo giờ VN, rỗng → ""', () => {
    expect(fmtDateTime('2026-10-22T01:12:00.000Z', 'vi')).toBe('22/10/2026 08:12');
    expect(fmtDateTime('2026-10-22T01:12:00.000Z', 'en')).toBe('Oct 22, 2026 08:12');
    expect(fmtDateTime(null, 'vi')).toBe('');
  });
});

describe('chọn nhiều', () => {
  const rows = [item({ id: 'a' }), item({ id: 'b', status: 'PUSHED' }), item({ id: 'c' })];
  it('chỉ ticket chưa tạo việc được chọn', () => expect(selectableIds(rows)).toEqual(['a', 'c']));
  it('ô chọn cả trang', () => {
    expect(headerCheck(new Set(), rows)).toBe('none');
    expect(headerCheck(new Set(['a']), rows)).toBe('some');
    expect(headerCheck(new Set(['a', 'c']), rows)).toBe('all');
    expect(headerCheck(new Set(), [rows[1]])).toBe('disabled');
  });
  it('bật/tắt cả trang giữ lựa chọn ở trang khác (như V1 giữ selectedIds qua trang)', () => {
    expect([...toggleAllOnPage(new Set(['z']), rows, true)].sort()).toEqual(['a', 'c', 'z']);
    expect([...toggleAllOnPage(new Set(['a', 'c', 'z']), rows, false)]).toEqual(['z']);
    expect([...toggleOne(new Set(['a']), 'a')]).toEqual([]);
    expect([...toggleOne(new Set(), 'c')]).toEqual(['c']);
  });
});

describe('gán / xoá hàng loạt — đếm lỗi', () => {
  const ok = { status: 'fulfilled', value: { ok: true, status: 201 } } as PromiseSettledResult<{ ok: boolean; status: number }>;
  const http500 = { status: 'fulfilled', value: { ok: false, status: 500 } } as PromiseSettledResult<{ ok: boolean; status: number }>;
  const del204 = { status: 'fulfilled', value: { ok: true, status: 204 } } as PromiseSettledResult<{ ok: boolean; status: number }>;
  const net = { status: 'rejected', reason: new Error('x') } as PromiseSettledResult<{ ok: boolean; status: number }>;
  it('lỗi mạng và HTTP lỗi đều tính là thất bại (sửa lỗi V1 chỉ đếm lỗi mạng)', () => {
    expect(countBulkFailures([ok, del204])).toBe(0);
    expect(countBulkFailures([ok, http500, net])).toBe(2);
  });
});

describe('lịch tự động — body giống V1', () => {
  const cfg = (p: Partial<CronConfig> = {}): CronConfig => ({ enabled: true, hour: 7, minute: 5, enabled2: true, hour2: 12, minute2: 30, lastRunAt: null, lastResult: null, ...p });
  it('form từ cấu hình; chưa có cấu hình → mặc định V1', () => {
    expect(cronFormFrom(cfg())).toEqual({ e1: true, t1: '07:05', e2: true, t2: '12:30' });
    const d = V1_CRON_DEFAULT;
    expect(cronFormFrom(undefined)).toEqual({ e1: d.enabled, t1: '07:00', e2: d.enabled2, t2: '12:00' });
  });
  it('payload = 6 trường như CronPanel V1', () => {
    expect(JSON.stringify(cronPayload({ e1: true, t1: '07:05', e2: false, t2: '23:59' })))
      .toBe(v1CronBody({ enabled: true, hour: 7, minute: 5, enabled2: false, hour2: 23, minute2: 59 }));
  });
  it('khung giờ tắt mà để trống → giữ giờ cũ (V1 không cho trống)', () => {
    expect(cronPayload({ e1: true, t1: '06:00', e2: false, t2: '' }, cfg())).toEqual({ enabled: true, hour: 6, minute: 0, enabled2: false, hour2: 12, minute2: 30 });
  });
  it('lỗi: khung giờ đang bật mà trống', () => {
    expect(cronErrors({ e1: true, t1: '', e2: false, t2: '' })).toEqual({ t1: 'empty' });
    expect(cronErrors({ e1: true, t1: '07:00', e2: true, t2: '07:00' })).toEqual({});
  });
  it('nhãn giờ đang bật', () => {
    expect(cronTimes(cfg())).toEqual(['07:05', '12:30']);
    expect(cronTimes(cfg({ enabled: false }))).toEqual(['12:30']);
    expect(cronTimes(cfg({ enabled: false, enabled2: false }))).toEqual([]);
  });
});

describe('nhập JSON — luật + body giống V1', () => {
  const samples = ['', '   ', '[', '{"a":1', '[]', '[{"Code":"260860","Tiêu đề":"Cài máy in","Trạng thái":"Hoàn thành"}]', '{"success":true,"data":[]}', '"chuỗi"', '42'];
  it.each(samples)('parseImport(%j)', (s) => {
    const v1 = v1ImportBody(s);
    const v2 = parseImport(s);
    if (v1.disabled) {
      expect(v2.ok).toBe(false);
      if (!v2.ok) expect(v2.error).toBe(v1.parseError ? 'json' : 'empty');
    } else {
      expect(v2.ok).toBe(true);
      if (v2.ok) expect(JSON.stringify(v2.body)).toBe(v1.body);
    }
  });
});

describe('POST /sync — giống V1', () => {
  it('"Get từ API": chỉ method, không header/body', () => expect(syncInit()).toEqual({ method: 'POST' }));
  it('nhập JSON: header JSON + body { manualData }', () => {
    const p = parseImport('[{"Code":"1"}]');
    expect(p.ok && syncInit(p.body)).toEqual({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: v1ImportBody('[{"Code":"1"}]').disabled ? '' : (v1ImportBody('[{"Code":"1"}]') as { body: string }).body });
  });
});

describe('đặt lại dữ liệu (OTP) — giống V1', () => {
  it.each(['12a3 45', '1234567', '000000', ''])('sanitizeOtp(%j)', (s) => {
    expect(sanitizeOtp(s)).toBe(v1SanitizeOtp(s));
    expect(otpReady(sanitizeOtp(s))).toBe(v1SanitizeOtp(s).length === 6);
  });
  it('URL xoá', () => expect(resetUrl('012345')).toBe(v1ResetUrl('012345')));
});

/** A3-5 Báo cáo — logic thuần của V2 phải cho đúng kết quả như V1 (oracle: v1-report.fixture.ts). */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  todayISO, monthRange, quarterRange, yearRange, presetRange, prevRange, inferPeriod,
  parseOverview, overviewUpdate, excelHref, apiDateQuery, drillHref, perfHref, completionPct,
  kpiCards, pctText, parseTaskList, taskListApiUrl, taskListExcelHref, tlFileTag, tlRange, tlDisplayPreset,
  nextSort, filterOverdue, reportTabs, monthOptions, quarterOptions, pdfFileTag, rangeToggle,
} from '../report-logic';
import {
  v1PresetRange, v1PrevFilters, v1ExcelUrl, v1DateParams, v1KpiValues, v1DrillUrl, v1PerfLink, v1CompletionPct,
  v1TlBuildRange, v1BuildPeriodLabel, v1TlExcelUrl, v1TlRead, v1TaskListApiUrl, v1NextSort, v1FilterOverdue, v1PdfName,
} from './v1-report.fixture';

// 24/10/2026 10:00 giờ VN (= 03:00 UTC)
const NOW = new Date('2026-10-24T03:00:00.000Z');

describe('ngày theo giờ VN', () => {
  it('todayISO lấy ngày ở Asia/Bangkok (UTC+7), kể cả lúc 23:30 UTC hôm trước', () => {
    expect(todayISO(NOW)).toBe('2026-10-24');
    expect(todayISO(new Date('2026-10-23T18:30:00.000Z'))).toBe('2026-10-24');
    expect(todayISO(new Date('2026-10-23T16:59:00.000Z'))).toBe('2026-10-23');
  });
  it('khoảng tháng / quý / năm', () => {
    expect(monthRange(2026, 2)).toEqual({ dateFrom: '2026-02-01', dateTo: '2026-02-28' });
    expect(monthRange(2024, 2)).toEqual({ dateFrom: '2024-02-01', dateTo: '2024-02-29' });
    expect(quarterRange(2026, 4)).toEqual({ dateFrom: '2026-10-01', dateTo: '2026-12-31' });
    expect(quarterRange(2026, 1)).toEqual({ dateFrom: '2026-01-01', dateTo: '2026-03-31' });
    expect(yearRange(2025)).toEqual({ dateFrom: '2025-01-01', dateTo: '2025-12-31' });
  });
  it('nhận dạng kỳ từ khoảng ngày', () => {
    expect(inferPeriod({ dateFrom: '2026-10-01', dateTo: '2026-10-31' })).toEqual({ kind: 'month', y: 2026, m: 10 });
    expect(inferPeriod({ dateFrom: '2026-07-01', dateTo: '2026-09-30' })).toEqual({ kind: 'quarter', y: 2026, q: 3 });
    expect(inferPeriod({ dateFrom: '2026-01-01', dateTo: '2026-12-31' })).toEqual({ kind: 'year', y: 2026 });
    expect(inferPeriod({ dateFrom: '2026-10-05', dateTo: '2026-10-20' })).toEqual({ kind: 'range', a: '2026-10-05', b: '2026-10-20' });
    expect(inferPeriod({ dateFrom: '', dateTo: '' })).toEqual({ kind: 'all' });
  });
  it('danh sách tháng/quý để chọn: từ kỳ hiện tại lùi về 2025', () => {
    const m = monthOptions('2026-10-24');
    expect(m[0]).toEqual({ y: 2026, m: 10 });
    expect(m.at(-1)).toEqual({ y: 2025, m: 1 });
    expect(m).toHaveLength(22);
    const q = quarterOptions('2026-10-24');
    expect(q[0]).toEqual({ y: 2026, q: 4 });
    expect(q).toHaveLength(8);
  });
});

describe('Tổng quan — giống V1', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('kỳ mặc định Tháng / Quý = DateRangeFilter V1', () => {
    expect(presetRange('month', todayISO(NOW))).toEqual(v1PresetRange('month'));
    expect(presetRange('quarter', todayISO(NOW))).toEqual(v1PresetRange('quarter'));
  });
  it('kỳ trước lùi đúng số ngày như V1', () => {
    for (const r of [
      { dateFrom: '2026-10-01', dateTo: '2026-10-31' },
      { dateFrom: '2026-10-01', dateTo: '2026-12-31' },
      { dateFrom: '2026-03-01', dateTo: '2026-03-31' },
      { dateFrom: '2026-10-05', dateTo: '2026-10-05' },
      { dateFrom: '2024-03-01', dateTo: '2024-03-31' },
    ]) expect(prevRange(r)).toEqual(v1PrevFilters(r));
    expect(prevRange({ dateFrom: '', dateTo: '' })).toBeUndefined();
    expect(prevRange({ dateFrom: '2026-10-01', dateTo: '2026-10-31' })).toEqual({ dateFrom: '2026-08-31', dateTo: '2026-09-30' });
  });
  it('đọc URL như V1 (dateFrom/dateTo/preset/year, mặc định tháng hiện tại)', () => {
    const s = parseOverview(new URLSearchParams(''), todayISO(NOW));
    expect(s).toEqual({ range: v1PresetRange('month'), preset: 'month', year: 2026 });
    const s2 = parseOverview(new URLSearchParams('dateFrom=2026-01-01&dateTo=2026-03-31&preset=quarter&year=2025'), '2026-10-24');
    expect(s2).toEqual({ range: { dateFrom: '2026-01-01', dateTo: '2026-03-31' }, preset: 'quarter', year: 2025 });
  });
  it('đổi kỳ ghi cả preset + dateFrom/dateTo vào URL một lần, giữ khoá khác', () => {
    const q = overviewUpdate(new URLSearchParams('year=2025&x=1'), { preset: 'quarter', range: { dateFrom: '2026-10-01', dateTo: '2026-12-31' } });
    expect(Object.fromEntries(new URLSearchParams(q))).toEqual({ year: '2025', x: '1', preset: 'quarter', dateFrom: '2026-10-01', dateTo: '2026-12-31' });
    expect(new URLSearchParams(overviewUpdate(new URLSearchParams('preset=month'), { year: 2025 })).get('year')).toBe('2025');
  });
  it('URL Xuất Excel = V1', () => {
    for (const [r, p] of [[{ dateFrom: '2026-10-01', dateTo: '2026-10-31' }, 'month'], [{ dateFrom: '', dateTo: '' }, 'custom'], [{ dateFrom: '2026-10-01', dateTo: '2026-12-31' }, 'quarter']] as const)
      expect(excelHref(r, p)).toBe(v1ExcelUrl(r, p));
  });
  it('tham số API theo kỳ = V1 (bỏ giá trị rỗng)', () => {
    expect(apiDateQuery({ dateFrom: '2026-10-01', dateTo: '2026-10-31' })).toBe(v1DateParams({ dateFrom: '2026-10-01', dateTo: '2026-10-31' }));
    expect(apiDateQuery({ dateFrom: '', dateTo: '' })).toBe(v1DateParams({ dateFrom: undefined, dateTo: undefined }));
    expect(apiDateQuery({ dateFrom: '2026-10-01', dateTo: '' })).toBe('dateFrom=2026-10-01');
  });
  it('drill-down + link hiệu suất = V1', () => {
    for (const t of ['total', 'completed', 'in_progress', 'pending_review', 'overdue'] as const) {
      expect(drillHref(t, { dateFrom: '2026-10-01', dateTo: '2026-10-31' })).toBe(v1DrillUrl(t, '2026-10-01', '2026-10-31'));
      expect(drillHref(t, { dateFrom: '', dateTo: '' })).toBe(v1DrillUrl(t, '', ''));
    }
    expect(perfHref('u1', { dateFrom: '2026-10-01', dateTo: '2026-10-31' })).toBe(v1PerfLink('u1', '2026-10-01', '2026-10-31'));
    expect(completionPct(2, 3)).toBe(v1CompletionPct(2, 3));
    expect(completionPct(0, 0)).toBe(v1CompletionPct(0, 0));
  });
  it('tên tệp PDF = V1', () => {
    for (const [r, p] of [[{ dateFrom: '2026-10-01', dateTo: '2026-10-31' }, 'month'], [{ dateFrom: '2026-10-01', dateTo: '2026-12-31' }, 'quarter'], [{ dateFrom: '2026-10-05', dateTo: '2026-10-09' }, 'custom'], [{ dateFrom: '', dateTo: '' }, 'custom']] as const)
      expect(pdfFileTag(r, p)).toBe(v1PdfName(r, p));
  });
});

describe('ô KPI = công thức V1', () => {
  const kpi = { totalTasksCreated: 37, totalCompleted: 20, totalOverdue: 3, extensionCount: 9, extensionRate: 24,
    tasksByStatus: { IN_PROGRESS: 5, PENDING_REVIEW: 4, WAITING_ACKNOWLEDGE: 2, COMPLETED: 20 } };
  const prev = { totalTasksCreated: 40, totalCompleted: 20, totalOverdue: 1, extensionCount: 2, extensionRate: 5, tasksByStatus: { IN_PROGRESS: 7 } };

  it('giá trị, chênh lệch, tỉ lệ hoàn thành 1 chữ số lẻ, cảnh báo gia hạn > 20%', () => {
    const v1 = v1KpiValues(kpi, prev);
    const c = Object.fromEntries(kpiCards(kpi, prev).map((x) => [x.key, x]));
    expect(c.total).toMatchObject({ value: v1.total.value, delta: v1.total.delta, drill: 'total' });
    expect(c.done).toMatchObject({ value: v1.completed.value, delta: v1.completed.delta, rate: v1.completed.progress, drill: 'completed' });
    expect(c.prog).toMatchObject({ value: v1.inProgress.value, delta: v1.inProgress.delta, drill: 'in_progress' });
    expect(c.wait).toMatchObject({ value: v1.pendingReview.value, delta: v1.pendingReview.delta, drill: 'pending_review', waitAck: 2, waitReview: 4 });
    expect(c.over).toMatchObject({ value: v1.overdue.value, delta: v1.overdue.delta, drill: 'overdue' });
    expect(c.ext).toMatchObject({ value: v1.extension.value, delta: v1.extension.delta, drill: null, warn: true, extRate: 24 });
    expect(kpiCards(kpi, prev).map((x) => x.key)).toEqual(['total', 'done', 'prog', 'wait', 'over', 'ext']);
  });
  it('không có kỳ trước → không có chênh lệch; tổng 0 → tỉ lệ 0', () => {
    const z = { ...kpi, totalTasksCreated: 0, totalCompleted: 0, extensionRate: 20 };
    const c = Object.fromEntries(kpiCards(z, undefined).map((x) => [x.key, x]));
    expect(c.total.delta).toBeUndefined();
    expect(c.done.rate).toBe(v1KpiValues(z).completed.progress);
    expect(c.ext.warn).toBe(false);
  });
  it('định dạng % theo ngôn ngữ, giữ 1 chữ số lẻ như V1 toFixed(1)', () => {
    expect(pctText(54.1, 'vi', 1, 1)).toBe('54,1%');
    expect(pctText(54.1, 'en', 1, 1)).toBe('54.1%');
    expect(pctText(50, 'vi', 1, 1)).toBe('50,0%');
    expect(pctText(67, 'vi')).toBe('67%');
    expect(pctText(1234, 'en')).toBe('1,234%');
  });
});

describe('Danh sách công việc — giống V1', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  const cases = [
    '',
    'userId=u1&dateFrom=2026-10-01&dateTo=2026-12-31',
    'preset=year&dateFrom=2026-01-01&dateTo=2026-12-31&search=vpn&sortBy=title&sortOrder=asc&page=3&pageSize=50',
    'preset=custom&dateFrom=2026-10-05&dateTo=2026-10-09&page=0',
  ];
  it('đọc URL + URL gọi API = V1', () => {
    for (const q of cases) {
      const sp = new URLSearchParams(q);
      const s = parseTaskList(sp, todayISO(NOW));
      const v = v1TlRead(sp);
      expect(s).toEqual({ ...v, range: { dateFrom: v.range.dateFrom, dateTo: v.range.dateTo }, preset: v.range.preset });
      expect(taskListApiUrl(s)).toBe(v1TaskListApiUrl(v));
    }
  });
  it('URL Xuất Excel + nhãn kỳ = V1', () => {
    for (const q of cases) {
      const sp = new URLSearchParams(q);
      const s = parseTaskList(sp, todayISO(NOW));
      const v = v1TlRead(sp);
      expect(taskListExcelHref(s)).toBe(v1TlExcelUrl(v.range, v.userId));
      expect(tlFileTag(s)).toBe(v1BuildPeriodLabel(v.range));
    }
  });
  it('chọn tháng / "tất cả tháng" (năm) = TaskListFilter.buildRange V1', () => {
    for (const [m, y] of [[0, 2026], [2, 2024], [10, 2026], [12, 2025]]) {
      const v = v1TlBuildRange(m, y);
      expect(tlRange(m, y)).toEqual({ preset: v.preset, range: { dateFrom: v.dateFrom, dateTo: v.dateTo } });
    }
  });
  it('kiểu kỳ hiển thị: theo URL, link từ Tổng quan (không có preset) nhận theo khoảng ngày', () => {
    expect(tlDisplayPreset({ preset: 'month', range: { dateFrom: '2026-10-01', dateTo: '2026-10-31' } })).toBe('month');
    expect(tlDisplayPreset({ preset: 'month', range: { dateFrom: '2026-10-01', dateTo: '2026-12-31' } })).toBe('custom');
    expect(tlDisplayPreset({ preset: 'year', range: { dateFrom: '2026-01-01', dateTo: '2026-12-31' } })).toBe('year');
    expect(tlDisplayPreset({ preset: 'custom', range: { dateFrom: '2026-10-01', dateTo: '2026-10-31' } })).toBe('custom');
  });
  it('bấm cột sắp xếp = handleSort V1', () => {
    for (const [by, ord, f] of [['createdAt', 'desc', 'createdAt'], ['createdAt', 'asc', 'createdAt'], ['createdAt', 'desc', 'title'], ['title', 'desc', 'title']])
      expect(nextSort(by, ord as 'asc' | 'desc', f)).toEqual(v1NextSort(by, ord, f));
  });
});

describe('Research — lọc việc quá hạn = V1', () => {
  const L = [
    { id: '1', title: 'Sửa VPN', daysOverdue: 2, assignees: [{ user: { id: 'a', displayName: 'Nguyễn An' } }] },
    { id: '2', title: 'Máy in', daysOverdue: 9, assignees: [{ user: { id: 'b', displayName: 'Trần Bình' } }] },
    { id: '3', title: 'Camera', daysOverdue: 0, assignees: [] },
  ];
  it('tìm theo tiêu đề / người làm + quá hạn ≥ N ngày', () => {
    for (const [q, n] of [['', ''], ['vpn', ''], ['  BÌNH ', ''], ['', '3'], ['m', '1'], ['', '0'], ['', 'abc']])
      expect(filterOverdue(L, q, n)).toEqual(v1FilterOverdue(L, q, n));
  });
});

describe('khoảng ngày tuỳ chọn', () => {
  it('đổi một đầu mút, báo lỗi khi bắt đầu > kết thúc', () => {
    expect(rangeToggle({ dateFrom: '2026-10-01', dateTo: '2026-10-31' }, 'dateFrom', '2026-10-05')).toEqual({ range: { dateFrom: '2026-10-05', dateTo: '2026-10-31' }, invalid: false });
    expect(rangeToggle({ dateFrom: '2026-10-01', dateTo: '2026-10-31' }, 'dateTo', '2026-09-30')).toEqual({ range: { dateFrom: '2026-10-01', dateTo: '2026-09-30' }, invalid: true });
  });
});

describe('tab báo cáo theo vai trò (V1: link Danh sách công việc chỉ Boss/Admin; Research không có link)', () => {
  it('Boss/Admin thấy Tổng quan + Danh sách; Nhân viên chỉ Tổng quan; Research chỉ hiện khi đang ở trang đó', () => {
    expect(reportTabs(true, '/analytics').map((x) => x.key)).toEqual(['overview', 'tasks']);
    expect(reportTabs(false, '/analytics').map((x) => x.key)).toEqual(['overview']);
    expect(reportTabs(false, '/analytics/task-list').map((x) => x.key)).toEqual(['overview', 'tasks']);
    expect(reportTabs(true, '/analytics/research').map((x) => x.key)).toEqual(['overview', 'tasks', 'research']);
    expect(reportTabs(true, '/analytics/task-list').find((x) => x.on)?.key).toBe('tasks');
  });
});

/**
 * A3-1 Tổng quan: hàm thuần biến dữ liệu API V1 (`/api/dashboard/stats`, `/performance`) thành view model.
 * Số liệu KHÔNG tính lại — chỉ chọn/gom/định dạng đúng như trang V1 (`src/app/(dashboard)/page.tsx` cũ).
 */
import { describe, it, expect } from 'vitest';
import {
  isBossRole, buildKpis, waitingCount, actionVerbKey, statusDistribution, priorityBars,
  workflowSplit, perfSummary, greetingKey, timeAgo, commentPreview, monthIndex, FLOW, weekdayIndex, hourOf, isDashboardEmpty,
} from '../view-model/dashboard-logic';
import type { DashboardStats } from '../services/stats/types';

const base: DashboardStats = {
  totalTasks: 161, completedTasks: 158, completionRate: '98.1', overdueCount: 3, slaRate: '79.7',
  pendingApproval: 2, pendingReview: 5, pendingExtensions: 1, myInProgress: 4, myWaitingAck: 6,
  tasksByStatus: { IN_PROGRESS: 2, COMPLETED: 3 },
  tasksByWorkflowMode: { IMMEDIATE: 3, NEED_APPROVAL: 1 },
  tasksByPriority: [{ priorityId: 'p1', name: 'Khẩn cấp', color: '#EF4444', count: 4 }],
  recentTasks: [], actionItems: [], upcomingDeadlines: [], recentComments: [],
};

describe('isBossRole — như V1 page.tsx: BOSS hoặc ADMIN', () => {
  it('ADMIN/BOSS là true, EMPLOYEE/rỗng là false', () => {
    expect(isBossRole('ADMIN')).toBe(true);
    expect(isBossRole('BOSS')).toBe(true);
    expect(isBossRole('EMPLOYEE')).toBe(false);
    expect(isBossRole(undefined)).toBe(false);
  });
});

describe('buildKpis — 6 ô như V1, ô 3–4 theo vai trò', () => {
  it('Boss/Admin: Tổng · Hoàn thành · Chờ duyệt · Chờ nghiệm thu · Quá hạn · SLA', () => {
    const k = buildKpis(base, 'BOSS');
    expect(k.map((x) => x.key)).toEqual(['total', 'done', 'approval', 'review', 'overdue', 'sla']);
    expect(k[0].value).toBe(161);
    expect(k[1]).toMatchObject({ value: 158, rate: 98.1, bar: 98.1 });
    expect(k[2]).toMatchObject({ value: 2, status: 'PENDING_APPROVAL' });
    expect(k[3]).toMatchObject({ value: 5, status: 'PENDING_REVIEW' });
    expect(k[4]).toMatchObject({ value: 3, bad: true });
    expect(k[5]).toMatchObject({ value: 79.7, bar: 79.7, tone: 'warn' });
  });
  it('Admin giống Boss', () => {
    expect(buildKpis(base, 'ADMIN')).toEqual(buildKpis(base, 'BOSS'));
  });
  it('Nhân viên: ô 3 = Đang làm của tôi (myInProgress), ô 4 = Chờ tôi nhận (myWaitingAck)', () => {
    const k = buildKpis(base, 'EMPLOYEE');
    expect(k.map((x) => x.key)).toEqual(['total', 'done', 'myProg', 'myAck', 'overdue', 'sla']);
    expect(k[2]).toMatchObject({ value: 4, status: 'IN_PROGRESS' });
    expect(k[3]).toMatchObject({ value: 6, status: 'WAITING_ACKNOWLEDGE' });
  });
  it('Quá hạn = 0 không tô đỏ', () => {
    expect(buildKpis({ ...base, overdueCount: 0 }, 'BOSS')[4].bad).toBe(false);
  });
  it('SLA: ngưỡng màu V1 ≥80 tốt · ≥60 cảnh báo · còn lại xấu; "—" → null, không có thanh', () => {
    const sla = (s: string) => buildKpis({ ...base, slaRate: s }, 'BOSS')[5];
    expect(sla('80.0').tone).toBe('good');
    expect(sla('60.0').tone).toBe('warn');
    expect(sla('59.9').tone).toBe('bad');
    expect(sla('—')).toMatchObject({ value: null, bar: undefined, tone: 'none' });
  });
  it('Tỉ lệ hoàn thành "0" (không có việc) → 0', () => {
    expect(buildKpis({ ...base, totalTasks: 0, completedTasks: 0, completionRate: '0' }, 'EMPLOYEE')[1]).toMatchObject({ value: 0, rate: 0 });
  });
});

describe('waitingCount — dòng chào: dùng lại số của ô KPI', () => {
  it('Boss/Admin = chờ duyệt + chờ nghiệm thu (không cộng gia hạn)', () => {
    expect(waitingCount(base, 'BOSS')).toBe(7);
    expect(waitingCount(base, 'ADMIN')).toBe(7);
  });
  it('Nhân viên = đang làm + chờ nhận', () => {
    expect(waitingCount(base, 'EMPLOYEE')).toBe(10);
  });
});

describe('actionVerbKey — việc cần xử lý: động từ theo trạng thái', () => {
  it.each([
    ['PENDING_APPROVAL', 'act.approve'], ['PENDING_REVIEW', 'act.review'],
    ['WAITING_ACKNOWLEDGE', 'act.accept'], ['IN_PROGRESS', 'act.report'], ['COMPLETED', null],
  ])('%s → %s', (s, k) => expect(actionVerbKey(s)).toBe(k));
});

describe('statusDistribution — đủ 7 trạng thái theo thứ tự quy trình, % làm tròn', () => {
  it('đếm + phần trăm, trạng thái không có = 0', () => {
    const d = statusDistribution({ IN_PROGRESS: 1, COMPLETED: 2, WEIRD: 9 });
    expect(d.total).toBe(3);
    expect(d.rows.map((r) => r.status)).toEqual([...FLOW]);
    expect(d.rows.find((r) => r.status === 'COMPLETED')).toMatchObject({ count: 2, pct: 67 });
    expect(d.rows.find((r) => r.status === 'IN_PROGRESS')).toMatchObject({ count: 1, pct: 33 });
    expect(d.rows.find((r) => r.status === 'DRAFT')).toMatchObject({ count: 0, pct: 0 });
  });
  it('rỗng → total 0', () => {
    expect(statusDistribution({}).total).toBe(0);
  });
});

describe('priorityBars — mức ưu tiên lấy từ DB (tên), sắp level giảm dần, gồm cả mức 0 việc', () => {
  const prios = [
    { id: 'p2', name: 'Bình thường', level: 1 }, { id: 'p1', name: 'Khẩn cấp', level: 4 }, { id: 'p3', name: 'Cao', level: 2 },
  ];
  it('ghép số đếm V1 vào danh sách mức, độ dài thanh theo max', () => {
    const r = priorityBars([{ priorityId: 'p1', name: 'Khẩn cấp', color: '#f00', count: 4 }, { priorityId: 'p3', name: 'Cao', color: '#0f0', count: 2 }], prios);
    expect(r.total).toBe(6);
    expect(r.rows.map((x) => [x.name, x.count, x.width, x.level])).toEqual([
      ['Khẩn cấp', 4, 100, 4], ['Cao', 2, 50, 2], ['Bình thường', 0, 0, 1],
    ]);
  });
  it('chưa có danh sách mức → chỉ các nhóm V1 trả về (level null)', () => {
    const r = priorityBars([{ priorityId: 'x', name: 'X', color: '#123456', count: 1 }], undefined);
    expect(r.rows).toEqual([{ id: 'x', name: 'X', color: '#123456', level: null, count: 1, width: 100 }]);
  });
  it('nhóm có priorityId lạ (mức đã xoá) vẫn được giữ', () => {
    const r = priorityBars([{ priorityId: 'gone', name: 'gone', color: '#6b7280', count: 3 }], prios);
    expect(r.rows.map((x) => x.id)).toContain('gone');
    expect(r.total).toBe(3);
  });
});

describe('workflowSplit — Trực tiếp (IMMEDIATE) / Phê duyệt (NEED_APPROVAL)', () => {
  it('số + %', () => {
    expect(workflowSplit({ IMMEDIATE: 3, NEED_APPROVAL: 1 })).toEqual({ total: 4, direct: 3, approval: 1, directPct: 75, approvalPct: 25 });
  });
  it('0 việc → 0%', () => {
    expect(workflowSplit({ IMMEDIATE: 0, NEED_APPROVAL: 0 })).toEqual({ total: 0, direct: 0, approval: 0, directPct: 0, approvalPct: 0 });
  });
});

describe('perfSummary — tổng + trục Y của biểu đồ Hiệu suất', () => {
  it('cộng tổng tạo mới / hoàn thành, bước trục theo max', () => {
    const s = perfSummary([{ date: '2026-10-01', created: 3, completed: 1 }, { date: '2026-10-02', created: 0, completed: 7 }]);
    expect(s).toMatchObject({ created: 3, completed: 8, max: 7, step: 2, top: 8, empty: false });
  });
  it.each([[0, 1, 0], [4, 1, 4], [10, 2, 10], [11, 5, 15], [26, 10, 30]])('max %i → bước %i, đỉnh %i', (max, step, top) => {
    const s = perfSummary([{ date: 'd', created: max, completed: 0 }]);
    expect(s.step).toBe(step);
    expect(s.top).toBe(top);
  });
  it('không có điểm nào > 0 → empty', () => {
    expect(perfSummary([{ date: 'd', created: 0, completed: 0 }]).empty).toBe(true);
    expect(perfSummary([]).empty).toBe(true);
  });
});

describe('greetingKey — theo giờ', () => {
  it.each([[0, 'db.hi.am'], [10, 'db.hi.am'], [11, 'db.hi.pm'], [17, 'db.hi.pm'], [18, 'db.hi.eve'], [23, 'db.hi.eve']])('%i giờ → %s', (h, k) => {
    expect(greetingKey(h)).toBe(k);
  });
});

describe('timeAgo — khoá ago.* (bình luận gần đây)', () => {
  const now = new Date('2026-10-23T03:00:00.000Z'); // 10:00 giờ VN
  it('< 1 phút → ago.now', () => {
    expect(timeAgo('2026-10-23T02:59:30.000Z', now)).toEqual({ key: 'ago.now' });
  });
  it('phút / giờ', () => {
    expect(timeAgo('2026-10-23T02:55:00.000Z', now)).toEqual({ key: 'ago.min', values: { n: 5 } });
    expect(timeAgo('2026-10-23T00:00:00.000Z', now)).toEqual({ key: 'ago.hour', values: { n: 3 } });
  });
  it('hôm qua (theo ngày lịch giờ VN) → ago.yday + giờ:phút', () => {
    expect(timeAgo('2026-10-22T09:30:00.000Z', now)).toEqual({ key: 'ago.yday', values: { h: '16:30' } });
  });
  it('cùng ngày nhưng > 1 giờ vẫn là ago.hour', () => {
    expect(timeAgo('2026-10-22T17:30:00.000Z', now)).toEqual({ key: 'ago.hour', values: { n: 9 } });
  });
  it('xa hơn → date (để định dạng ngày)', () => {
    expect(timeAgo('2026-10-20T09:30:00.000Z', now)).toEqual({ key: 'date' });
  });
});

describe('commentPreview — chữ 1 dòng cho khối bình luận', () => {
  it('@[Tên] → @Tên, gộp khoảng trắng/xuống dòng', () => {
    expect(commentPreview('@[Lê Minh]  xem giúp\n\nnhé ')).toBe('@Lê Minh xem giúp nhé');
  });
});

describe('monthIndex — tháng hiện tại theo giờ VN (0–11)', () => {
  it('31/10 23:30 VN (16:30Z) vẫn là tháng 10', () => {
    expect(monthIndex(new Date('2026-10-31T16:29:00.000Z'))).toBe(9);
  });
  it('1/11 00:30 VN (31/10 17:30Z) là tháng 11', () => {
    expect(monthIndex(new Date('2026-10-31T17:30:00.000Z'))).toBe(10);
  });
});

describe('weekdayIndex / hourOf — theo giờ VN', () => {
  it('Thứ Bảy 24/10 00:30 VN (23/10 17:30Z) → 6, giờ 0', () => {
    const d = new Date('2026-10-23T17:30:00.000Z');
    expect(weekdayIndex(d)).toBe(6);
    expect(hourOf(d)).toBe(0);
  });
  it('Thứ Sáu 23/10 10:00 VN → 5, giờ 10', () => {
    const d = new Date('2026-10-23T03:00:00.000Z');
    expect(weekdayIndex(d)).toBe(5);
    expect(hourOf(d)).toBe(10);
  });
});

describe('isDashboardEmpty — chưa có công việc nào (câu "Chưa có công việc nào")', () => {
  it('tổng 0 và không có việc gần đây → rỗng', () => {
    expect(isDashboardEmpty({ ...base, totalTasks: 0, recentTasks: [] })).toBe(true);
  });
  it('chỉ có việc đã hủy (tổng 0 nhưng có việc gần đây) → không rỗng', () => {
    expect(isDashboardEmpty({ ...base, totalTasks: 0, recentTasks: [{} as DashboardStats['recentTasks'][number]] })).toBe(false);
  });
  it('có việc → không rỗng', () => {
    expect(isDashboardEmpty(base)).toBe(false);
  });
});

import type { DigestData } from './digest-data.service';
import { badge, detailBtn, sectionTable, sectionCard } from './digest-email.helpers';

const ICONS = {
  clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  doc:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  pulse: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

export function buildDeadlineSoonCard(items: DigestData['deadlineSoon'], baseUrl: string): string {
  const rows = items.map((t) => [
    t.title,
    t.assigneeName,
    t.daysLeft === 0 ? badge('Hôm nay', '#fef2f2', '#dc2626') : badge(`Còn ${t.daysLeft} ngày`, '#fffbeb', '#d97706'),
    t.deadline,
    detailBtn(`${baseUrl}/tasks/${t.id}`),
  ]);
  return sectionCard('#f59e0b', ICONS.clock, 'Sắp hết hạn', items.length, 'task',
    sectionTable(['Tên task', 'Nhân viên', 'Thời hạn', 'Deadline', ''], rows));
}

export function buildOverdueCard(items: DigestData['overdue'], baseUrl: string): string {
  const rows = items.map((t) => [
    t.title,
    t.assigneeName,
    badge(`Quá ${t.daysOverdue} ngày`, '#fef2f2', '#dc2626'),
    t.deadline,
    detailBtn(`${baseUrl}/tasks/${t.id}`),
  ]);
  return sectionCard('#ef4444', ICONS.alert, 'Quá hạn', items.length, 'task',
    sectionTable(['Tên task', 'Nhân viên', 'Trạng thái', 'Deadline', ''], rows));
}

export function buildPendingApprovalCard(items: DigestData['pendingApproval'], baseUrl: string): string {
  const rows = items.map((t) => [
    t.title,
    t.requesterName,
    t.submittedAt,
    detailBtn(`${baseUrl}/tasks/${t.id}`),
  ]);
  return sectionCard('#f59e0b', ICONS.doc, 'Chờ phê duyệt', items.length, 'task',
    sectionTable(['Tên task', 'Người gửi', 'Ngày gửi', ''], rows));
}

export function buildInProgressCard(items: DigestData['inProgress'], baseUrl: string): string {
  const rows = items.map((t) => [
    t.title,
    t.assigneeName,
    t.startedAt,
    detailBtn(`${baseUrl}/tasks/${t.id}`),
  ]);
  return sectionCard('#3b82f6', ICONS.pulse, 'Đang thực hiện', items.length, 'task',
    sectionTable(['Tên task', 'Nhân viên', 'Cập nhật', ''], rows));
}

export function buildSummaryCard(items: DigestData['summaryByEmployee']): string {
  const rows = items.map((e) => [
    e.name,
    `<span style="font-weight:600;color:#3b82f6">${e.inProgress}</span>`,
    `<span style="font-weight:600;color:#10b981">${e.completed}</span>`,
    e.overdue > 0 ? badge(String(e.overdue), '#fef2f2', '#dc2626') : `<span style="color:#9ca3af">0</span>`,
  ]);
  return sectionCard('#8b5cf6', ICONS.users, 'Tổng hợp theo nhân viên', items.length, 'người',
    sectionTable(['Nhân viên', 'Đang làm', 'Hoàn thành', 'Quá hạn'], rows));
}

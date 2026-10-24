import { describe, it, expect } from 'vitest';
import { DAY_ORDER, toggleDay, toggleWeekdays, allWeekdays, toggleMin1, minuteOptions, scheduleDays, pad2 } from '../schedule';
import { settingsSections } from '../settings-nav';
import { v1ToggleMin1, v1ToggleWeekdays } from './v1-settings.fixture';

describe('Lịch gửi (giờ Việt Nam, như V1)', () => {
  it('thứ tự ngày T2 → CN, CN = 0 như cron V1', () => {
    expect(DAY_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
  it.each([[[]], [[1, 2, 3, 4, 5]], [[1, 3]], [[0, 6]], [[1, 2, 3, 4, 5, 6, 0]], [[6, 1, 2, 3, 4, 5]]])('T2–T6 bật/tắt giống V1: %j', (days) => {
    expect(toggleWeekdays(days)).toEqual(v1ToggleWeekdays(days));
    expect(allWeekdays(days)).toBe([1, 2, 3, 4, 5].every((d) => days.includes(d)));
  });
  it('bấm 1 ngày: thêm cuối / bỏ (như V1)', () => {
    expect(toggleDay([1, 3], 5)).toEqual([1, 3, 5]);
    expect(toggleDay([1, 3], 1)).toEqual([3]);
  });
  it.each([[['A'], 'A'], [['A', 'B'], 'A'], [['A'], 'B'], [[], 'A']])('không cho bỏ mục cuối (Nhắc quá hạn V1): %j − %s', (cur, v) => {
    expect(toggleMin1(cur as string[], v as string)).toEqual(v1ToggleMin1(cur as string[], v as string));
  });
  it('phút 00/15/30/45 như V1; giá trị lạ đang lưu vẫn hiện (không bị đổi ngầm)', () => {
    expect(minuteOptions(0)).toEqual([0, 15, 30, 45]);
    expect(minuteOptions(30)).toEqual([0, 15, 30, 45]);
    expect(minuteOptions(20)).toEqual([0, 15, 20, 30, 45]);
  });
  it('ngày đã chọn sắp theo T2 → CN', () => {
    expect(scheduleDays([0, 3, 1, 6])).toEqual([1, 3, 6, 0]);
    expect(pad2(7)).toBe('07');
  });
});

describe('Mục cài đặt theo vai trò (giữ luật V1)', () => {
  const keys = (role: string, feats: string[] = []) => settingsSections(role, feats).map((s) => s.key);
  it('Admin: mọi mục (không có "Chung" — V1 không đưa vào menu)', () => {
    expect(keys('ADMIN')).toEqual(['priorities', 'types', 'templates', 'notifications', 'digest', 'overdue', 'smtp', 'emails', 'security']);
  });
  it('Boss: trừ mục chỉ Admin', () => {
    expect(keys('BOSS')).toEqual(['priorities', 'types', 'templates', 'notifications', 'digest', 'overdue']);
  });
  it('Nhân viên: chỉ mục được cấp trong featurePermissions.settings; thông báo là chỉ xem', () => {
    expect(keys('EMPLOYEE', ['completion_templates', 'profile', 'notifications'])).toEqual(['templates', 'notifications']);
    expect(settingsSections('EMPLOYEE', ['notifications'])[0].readOnly).toBe(true);
    expect(settingsSections('BOSS', [])[3].readOnly).toBe(false);
    expect(keys('EMPLOYEE', [])).toEqual([]);
  });
  it('đường dẫn V1; Mẫu email là tab của trang SMTP', () => {
    const m = Object.fromEntries(settingsSections('ADMIN', []).map((s) => [s.key, s.href]));
    expect(m).toMatchObject({ priorities: '/settings/priorities', types: '/settings/task-types', templates: '/settings/completion-templates', notifications: '/settings/notifications', digest: '/settings/digest', overdue: '/settings/overdue-reminder', smtp: '/settings/smtp', emails: '/settings/smtp?tab=templates', security: '/settings/security' });
  });
});

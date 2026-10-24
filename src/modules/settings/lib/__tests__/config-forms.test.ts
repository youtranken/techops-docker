import { describe, it, expect } from 'vitest';
import {
  smtpFormFrom, validateSmtp, smtpBody, smtpStatus, type SmtpForm,
  securityFormFrom, validateSecurity, securityBody, SECURITY_NUMS,
  digestFormFrom, validateDigest, digestBody, DIGEST_DEFAULT,
  overdueFormFrom, OVERDUE_DEFAULT,
  visibleNotifTypes, notifBody,
} from '../config-forms';
import { DEFAULT_SECURITY_CONFIG, NOTIFICATION_TYPES, type SecurityConfig } from '../../types';
import { v1Smtp, v1SmtpBody, v1Security, v1Digest, v1DigestRouteError, v1VisibleNotifTypes } from './v1-settings.fixture';

describe('SMTP', () => {
  const ok: SmtpForm = { host: 'smtp.x.vn', port: '587', secure: false, user: 'a@x.vn', password: '', fromName: 'TechOps', fromEmail: 'a@x.vn', isActive: true };

  it('form từ cấu hình đã lưu: mật khẩu luôn rỗng (không bao giờ đổ mật khẩu đã che vào ô)', () => {
    const f = smtpFormFrom({ id: '1', host: 'h', port: 1025, secure: false, user: 'u', password: '••••••••', fromName: 'n', fromEmail: 'e@x.vn', isActive: true, updatedAt: '' });
    expect(f.password).toBe('');
    expect(f.port).toBe('1025');
    expect(smtpFormFrom(null)).toEqual({ host: '', port: '587', secure: false, user: '', password: '', fromName: 'TechOps', fromEmail: '', isActive: true });
  });

  it('body PUT giống hệt V1 (cả password "" = giữ cũ)', () => {
    expect(JSON.stringify(smtpBody(ok))).toBe(JSON.stringify(v1SmtpBody(ok)));
    expect(JSON.stringify(smtpBody({ ...ok, password: 'p' }))).toBe(JSON.stringify(v1SmtpBody({ ...ok, password: 'p' })));
  });

  it.each<Partial<SmtpForm>>([
    {}, { host: '  ' }, { port: '0' }, { port: '65535' }, { port: '65536' }, { port: '' }, { port: '25.5' },
    { user: '' }, { user: ' ' }, { fromName: '' }, { fromEmail: 'abc' }, { fromEmail: ' a@x.vn ' }, { fromEmail: '' },
  ])('luật nhập khớp zod route V1: %j', (patch) => {
    const f = { ...ok, ...patch };
    expect(Object.keys(validateSmtp(f, true)).length === 0).toBe(v1Smtp.safeParse(v1SmtpBody(f)).success);
  });

  it('chưa có cấu hình → bắt buộc mật khẩu (service V1 ném PASSWORD_REQUIRED)', () => {
    expect(validateSmtp(ok, false).password?.key).toBe('set.v.req');
    expect(validateSmtp({ ...ok, password: 'x' }, false).password).toBeUndefined();
    expect(validateSmtp(ok, true).password).toBeUndefined();
  });

  it('trạng thái: chưa cấu hình / đang hoạt động / tạm dừng', () => {
    expect(smtpStatus(null)).toBe('none');
    expect(smtpStatus({ isActive: true })).toBe('ok');
    expect(smtpStatus({ isActive: false })).toBe('paused');
  });
});

describe('Bảo mật', () => {
  it('form ↔ body: giữ nguyên các trường không hiện (windowSeconds, historyCount) như V1 gửi cả cấu hình', () => {
    const cfg: SecurityConfig = { ...DEFAULT_SECURITY_CONFIG, rateLimit: { ...DEFAULT_SECURITY_CONFIG.rateLimit, windowSeconds: 120 }, passwordPolicy: { ...DEFAULT_SECURITY_CONFIG.passwordPolicy, historyCount: 3 } };
    expect(securityBody(securityFormFrom(cfg))).toEqual(cfg);
  });

  it('giới hạn số lấy đúng theo zod route V1 (không phải min/max ô nhập)', () => {
    expect(SECURITY_NUMS.map((n) => [n.path, n.min, n.max])).toEqual([
      ['rateLimit.loginMaxAttempts', 1, 100], ['rateLimit.lockoutMinutes', 1, 1440], ['rateLimit.maxRequests', 10, 10000],
      ['passwordPolicy.minLength', 6, 128], ['passwordPolicy.expiryDays', 0, 365],
      ['session.idleTimeoutMinutes', 5, 1440], ['session.maxSessionHours', 1, 168],
    ]);
  });

  it.each([
    ['rateLimit.loginMaxAttempts', '2'], ['rateLimit.loginMaxAttempts', '0'], ['rateLimit.loginMaxAttempts', '101'],
    ['rateLimit.maxRequests', '9'], ['rateLimit.maxRequests', '10000'], ['passwordPolicy.minLength', '5'],
    ['passwordPolicy.expiryDays', '0'], ['passwordPolicy.expiryDays', '366'], ['session.idleTimeoutMinutes', '4'],
    ['session.maxSessionHours', '168'], ['session.maxSessionHours', ''], ['session.maxSessionHours', '1.5'],
  ])('luật nhập khớp zod route V1: %s = %j', (path, val) => {
    const f = securityFormFrom(DEFAULT_SECURITY_CONFIG);
    const [s, k] = path.split('.') as [keyof SecurityConfig, string];
    (f[s] as Record<string, unknown>)[k] = val;
    const errs = validateSecurity(f);
    const body = { ...securityBody(f) };
    expect(Object.keys(errs).length === 0).toBe(v1Security.safeParse(body).success);
    if (Object.keys(errs).length) expect(errs[path]?.key).toMatch(/^set\.v\.(range|int)$/);
  });
});

describe('Báo cáo định kỳ', () => {
  it('chưa có cấu hình (404) → mặc định V1', () => {
    expect(digestFormFrom(null)).toEqual(DIGEST_DEFAULT);
    expect(DIGEST_DEFAULT).toMatchObject({ enabled: false, sendHour: 8, sendMinute: 0, emailSubject: 'Báo cáo định kỳ TechOps - {date}' });
  });

  it('body PATCH = nguyên form theo đúng thứ tự trường V1', () => {
    const f = { ...DIGEST_DEFAULT, enabled: true, sendWeekly: true };
    expect(Object.keys(digestBody(f))).toEqual(['enabled', 'sendWeekly', 'sendMonthly', 'sendDays', 'sendHour', 'sendMinute', 'recipientIds', 'contentTypes', 'emailSubject', 'emailGreeting']);
  });

  it.each([
    { enabled: true, sendWeekly: true },
    { enabled: true },
    { enabled: false },
    { enabled: true, sendDays: [1], contentTypes: [] },
    { enabled: true, sendMonthly: true, emailSubject: '' },
    { enabled: true, sendMonthly: true, emailSubject: ' ' },
    { enabled: true, sendMonthly: true, emailSubject: 's'.repeat(201) },
    { enabled: true, sendMonthly: true, emailGreeting: 'g'.repeat(501) },
  ])('luật nhập khớp zod + luật lịch của route V1: %j', (patch) => {
    const f = { ...DIGEST_DEFAULT, ...patch } as typeof DIGEST_DEFAULT;
    const r = validateDigest(f);
    const v1ok = v1Digest.safeParse(digestBody(f)).success && v1DigestRouteError(f) === null;
    expect(Object.keys(r.fields).length === 0 && !r.form).toBe(v1ok);
  });

  it('lỗi lịch/nội dung là lỗi chung của form (giống câu cảnh báo)', () => {
    expect(validateDigest({ ...DIGEST_DEFAULT, enabled: true }).form).toBe('set.dg.warnSched');
    expect(validateDigest({ ...DIGEST_DEFAULT, enabled: true, sendWeekly: true, contentTypes: [] }).form).toBe('set.dg.warnContent');
  });
});

describe('Nhắc quá hạn', () => {
  it('fallback như V1 khi trường thiếu', () => {
    expect(overdueFormFrom({ enabled: true, sendHour: 7, sendMinute: 15 } as never)).toEqual({ ...OVERDUE_DEFAULT, enabled: true, sendHour: 7, sendMinute: 15 });
  });
});

describe('Thông báo email', () => {
  it.each([
    ['ADMIN', 'all'], ['ADMIN', 'BOSS'], ['ADMIN', 'EMPLOYEE'], ['BOSS', 'all'], ['BOSS', 'BOSS'], ['EMPLOYEE', 'all'], ['EMPLOYEE', 'BOSS'],
  ] as const)('danh sách loại hiện giống V1: %s / %s', (role, filter) => {
    expect(visibleNotifTypes(role, filter)).toEqual(v1VisibleNotifTypes(NOTIFICATION_TYPES, role, filter));
  });
  it('body PATCH = { emailEnabled, emailTypes } như V1', () => {
    expect(notifBody({ emailEnabled: false, emailTypes: ['A'] })).toEqual({ emailEnabled: false, emailTypes: ['A'] });
  });
});

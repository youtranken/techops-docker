/**
 * Luật nhập + body cho các trang cấu hình (A3-7): SMTP, Bảo mật, Báo cáo định kỳ, Nhắc quá hạn, Thông báo email.
 * Luật = zod của route V1 (giới hạn số Bảo mật theo route, KHÔNG theo min/max ô nhập cũ); body = đúng V1.
 * Test đối chiếu: `__tests__/config-forms.test.ts` + `v1-settings.fixture.ts`.
 */
import { z } from 'zod';
import {
  NOTIFICATION_TYPES, DIGEST_CATEGORIES, INDIVIDUAL_EMAIL_TYPES,
  type SmtpConfig, type SecurityConfig, type DigestConfig, type DigestConfigInput, type DigestContentType,
  type OverdueReminderConfig, type OverdueReminderConfigInput, type DigestCategory, type IndividualEmailType,
} from '../types';
import type { FieldError } from './catalog-forms';

const INT = /^-?\d+$/;
const emailOk = (v: string) => z.string().trim().email().safeParse(v).success;

// ── SMTP ──
export interface SmtpForm {
  host: string; port: string; secure: boolean; user: string; password: string; fromName: string; fromEmail: string; isActive: boolean;
}
export type SmtpField = 'host' | 'port' | 'user' | 'password' | 'fromName' | 'fromEmail';

/** V1 SmtpSection: mật khẩu luôn để trống (server chỉ trả bản che) */
export function smtpFormFrom(c: SmtpConfig | null | undefined): SmtpForm {
  if (!c) return { host: '', port: '587', secure: false, user: '', password: '', fromName: 'TechOps', fromEmail: '', isActive: true };
  return { host: c.host, port: String(c.port), secure: c.secure, user: c.user, password: '', fromName: c.fromName, fromEmail: c.fromEmail, isActive: c.isActive };
}

export function validateSmtp(f: SmtpForm, configured: boolean): Partial<Record<SmtpField, FieldError>> {
  const e: Partial<Record<SmtpField, FieldError>> = {};
  if (!f.host.trim()) e.host = { key: 'set.v.req' };
  const port = Number(f.port);
  if (!INT.test(f.port.trim()) || port < 1 || port > 65535) e.port = { key: 'set.v.range', values: { a: 1, b: 65535 } };
  if (!f.user.trim()) e.user = { key: 'set.v.req' };
  if (!configured && !f.password) e.password = { key: 'set.v.req' };
  if (!f.fromName.trim()) e.fromName = { key: 'set.v.req' };
  if (!f.fromEmail.trim()) e.fromEmail = { key: 'set.v.req' };
  else if (!emailOk(f.fromEmail)) e.fromEmail = { key: 'set.v.mail' };
  return e;
}

/** V1: PUT nguyên form (port số; password '' = giữ mật khẩu đang lưu) */
export function smtpBody(f: SmtpForm) {
  return { host: f.host, port: Number(f.port), secure: f.secure, user: f.user, password: f.password, fromName: f.fromName, fromEmail: f.fromEmail, isActive: f.isActive };
}

export function smtpStatus(c: { isActive: boolean } | null | undefined): 'none' | 'ok' | 'paused' {
  if (!c) return 'none';
  return c.isActive ? 'ok' : 'paused';
}

// ── Bảo mật ──
type Sec = keyof SecurityConfig;
export type SecurityForm = {
  [S in Sec]: { [F in keyof SecurityConfig[S]]: SecurityConfig[S][F] extends number ? string : SecurityConfig[S][F] };
};
/** Ô số hiện trên trang + giới hạn theo zod route V1 (`api/settings/security`) */
export const SECURITY_NUMS = [
  { path: 'rateLimit.loginMaxAttempts', min: 1, max: 100 },
  { path: 'rateLimit.lockoutMinutes', min: 1, max: 1440 },
  { path: 'rateLimit.maxRequests', min: 10, max: 10000 },
  { path: 'passwordPolicy.minLength', min: 6, max: 128 },
  { path: 'passwordPolicy.expiryDays', min: 0, max: 365 },
  { path: 'session.idleTimeoutMinutes', min: 5, max: 1440 },
  { path: 'session.maxSessionHours', min: 1, max: 168 },
] as const;
export type SecurityNumPath = (typeof SECURITY_NUMS)[number]['path'];

function mapSection<T extends object>(o: T, fn: (v: unknown) => unknown) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fn(v)]));
}

export function securityFormFrom(c: SecurityConfig): SecurityForm {
  const toStr = (v: unknown) => (typeof v === 'number' ? String(v) : v);
  return {
    rateLimit: mapSection(c.rateLimit, toStr),
    passwordPolicy: mapSection(c.passwordPolicy, toStr),
    session: mapSection(c.session, toStr),
  } as SecurityForm;
}

/** Body PUT như V1: gửi cả cấu hình (kể cả windowSeconds, historyCount không hiện trên trang) */
export function securityBody(f: SecurityForm): SecurityConfig {
  const toNum = (v: unknown) => (typeof v === 'string' ? (v.trim() === '' ? NaN : Number(v)) : v);
  return {
    rateLimit: mapSection(f.rateLimit, toNum),
    passwordPolicy: mapSection(f.passwordPolicy, toNum),
    session: mapSection(f.session, toNum),
  } as unknown as SecurityConfig;
}

export function getSecurityValue(f: SecurityForm, path: string): unknown {
  const [s, k] = path.split('.') as [Sec, string];
  return (f[s] as Record<string, unknown>)[k];
}

export function setSecurityValue(f: SecurityForm, path: string, v: unknown): SecurityForm {
  const [s, k] = path.split('.') as [Sec, string];
  return { ...f, [s]: { ...f[s], [k]: v } } as SecurityForm;
}

export function validateSecurity(f: SecurityForm): Partial<Record<string, FieldError>> {
  const e: Partial<Record<string, FieldError>> = {};
  for (const n of SECURITY_NUMS) {
    const raw = String(getSecurityValue(f, n.path) ?? '').trim();
    if (!INT.test(raw)) { e[n.path] = { key: 'set.v.int' }; continue; }
    const v = Number(raw);
    if (v < n.min || v > n.max) e[n.path] = { key: 'set.v.range', values: { a: n.min, b: n.max } };
  }
  return e;
}

// ── Báo cáo định kỳ ──
export const DIGEST_CONTENT_KEYS: DigestContentType[] = ['DEADLINE_SOON', 'IN_PROGRESS', 'OVERDUE', 'PENDING_APPROVAL', 'SUMMARY_BY_EMPLOYEE'];
/** V1 DigestSection.DEFAULT (khi chưa có cấu hình — GET trả 404/null) */
export const DIGEST_DEFAULT: DigestConfigInput = {
  enabled: false,
  sendWeekly: false,
  sendMonthly: false,
  sendDays: [],
  sendHour: 8,
  sendMinute: 0,
  recipientIds: [],
  contentTypes: [...DIGEST_CONTENT_KEYS],
  emailSubject: 'Báo cáo định kỳ TechOps - {date}',
  emailGreeting: 'Xin chào, đây là báo cáo tình trạng công việc định kỳ từ hệ thống TechOps.',
};

export function digestFormFrom(d: DigestConfig | null | undefined): DigestConfigInput {
  if (!d) return { ...DIGEST_DEFAULT, sendDays: [], recipientIds: [], contentTypes: [...DIGEST_DEFAULT.contentTypes] };
  return {
    enabled: d.enabled,
    sendWeekly: d.sendWeekly,
    sendMonthly: d.sendMonthly,
    sendDays: d.sendDays ?? [],
    sendHour: d.sendHour,
    sendMinute: d.sendMinute,
    recipientIds: d.recipientIds ?? [],
    contentTypes: d.contentTypes,
    emailSubject: d.emailSubject,
    emailGreeting: d.emailGreeting,
  };
}

/** V1: PATCH nguyên form */
export function digestBody(f: DigestConfigInput): DigestConfigInput {
  return {
    enabled: f.enabled, sendWeekly: f.sendWeekly, sendMonthly: f.sendMonthly, sendDays: f.sendDays, sendHour: f.sendHour,
    sendMinute: f.sendMinute, recipientIds: f.recipientIds, contentTypes: f.contentTypes, emailSubject: f.emailSubject, emailGreeting: f.emailGreeting,
  };
}

export function validateDigest(f: DigestConfigInput): { fields: Partial<Record<'emailSubject' | 'emailGreeting', FieldError>>; form?: string } {
  const fields: Partial<Record<'emailSubject' | 'emailGreeting', FieldError>> = {};
  if (f.emailSubject.length === 0) fields.emailSubject = { key: 'set.v.req' };
  else if (f.emailSubject.length > 200) fields.emailSubject = { key: 'setx.v.max', values: { n: 200 } };
  if (f.emailGreeting.length > 500) fields.emailGreeting = { key: 'setx.v.max', values: { n: 500 } };
  // Luật thêm của route PATCH (US4.9)
  let form: string | undefined;
  if (f.enabled) {
    if (!(f.sendDays.length > 0 || f.sendWeekly || f.sendMonthly)) form = 'set.dg.warnSched';
    else if (f.contentTypes.length === 0) form = 'set.dg.warnContent';
  }
  return { fields, form };
}

// ── Nhắc quá hạn ──
export const OVERDUE_CATEGORIES = [...DIGEST_CATEGORIES] as DigestCategory[];
export const OVERDUE_INDIVIDUAL = [...INDIVIDUAL_EMAIL_TYPES] as IndividualEmailType[];
/** V1 OverdueReminderSection.DEFAULT */
export const OVERDUE_DEFAULT: OverdueReminderConfigInput = {
  enabled: false,
  sendDays: [1, 2, 3, 4, 5],
  sendHour: 9,
  sendMinute: 0,
  digestCategories: OVERDUE_CATEGORIES,
  individualEmailTypes: OVERDUE_INDIVIDUAL,
};

export function overdueFormFrom(d: OverdueReminderConfig): OverdueReminderConfigInput {
  return {
    enabled: d.enabled,
    sendDays: d.sendDays ?? [1, 2, 3, 4, 5],
    sendHour: d.sendHour,
    sendMinute: d.sendMinute,
    digestCategories: (d.digestCategories as DigestCategory[] | undefined) ?? OVERDUE_CATEGORIES,
    individualEmailTypes: (d.individualEmailTypes as IndividualEmailType[] | undefined) ?? OVERDUE_INDIVIDUAL,
  };
}

// ── Thông báo email ──
export type NotifFilter = 'all' | 'BOSS' | 'EMPLOYEE';
/** V1 NotificationSection: nhân viên chỉ thấy loại gửi cho nhân viên; Boss/Admin lọc theo người nhận */
export function visibleNotifTypes(role: string, filter: NotifFilter): string[] {
  return Object.entries(NOTIFICATION_TYPES)
    .filter(([, info]) => {
      if (role === 'EMPLOYEE') return info.roles.includes('EMPLOYEE');
      if (filter === 'all') return true;
      return info.roles.includes(filter);
    })
    .map(([k]) => k);
}

export function notifBody(f: { emailEnabled: boolean; emailTypes: string[] }) {
  return { emailEnabled: f.emailEnabled, emailTypes: f.emailTypes };
}

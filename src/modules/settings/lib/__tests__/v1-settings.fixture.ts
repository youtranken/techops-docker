/**
 * Bản sao NGUYÊN VĂN luật V1 (trước A3-7) để test đối chiếu — không import từ code đang chạy.
 * Nguồn: src/app/api/settings/** (zod của route) + các component V1 đã thay (PriorityForm, TaskTypeForm,
 * ReportTemplatesSection.toInput, SmtpSection, SecuritySection, DigestSection, OverdueReminderSection, NotificationSection).
 */
import { z } from 'zod';

// ── Route zod ──
export const v1PriorityCreate = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải là mã hex hợp lệ'),
  level: z.number().int().min(1).max(10),
  isDefault: z.boolean().optional().default(false),
});
export const v1PriorityUpdate = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  level: z.number().int().min(1).max(10).optional(),
  isDefault: z.boolean().optional(),
});
export const v1TaskTypeCreate = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(50).optional(),
  description: z.string().max(255).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});
export const v1TaskTypeUpdate = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(255).optional(),
});
export const v1TemplateCreate = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().max(100).optional(),
  taskTypeId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().default(true),
});
export const v1TemplateUpdate = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: z.string().max(100).optional().nullable(),
  taskTypeId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
});
export const v1Smtp = z.object({
  host: z.string().trim().min(1, 'Host không được để trống'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().min(1, 'Tài khoản không được để trống'),
  password: z.string().optional(),
  fromName: z.string().trim().min(1, 'Tên hiển thị không được để trống'),
  fromEmail: z.string().trim().email('Email gửi không hợp lệ'),
  isActive: z.boolean(),
});
export const v1Security = z.object({
  rateLimit: z.object({
    enabled: z.boolean(),
    maxRequests: z.number().int().min(10).max(10000),
    windowSeconds: z.number().int().min(10).max(3600),
    loginMaxAttempts: z.number().int().min(1).max(100),
    lockoutMinutes: z.number().int().min(1).max(1440),
  }).optional(),
  passwordPolicy: z.object({
    minLength: z.number().int().min(6).max(128),
    requireUppercase: z.boolean(),
    requireLowercase: z.boolean(),
    requireNumber: z.boolean(),
    requireSpecialChar: z.boolean(),
    expiryDays: z.number().int().min(0).max(365),
    historyCount: z.number().int().min(0).max(24),
  }).optional(),
  session: z.object({
    idleTimeoutMinutes: z.number().int().min(5).max(1440),
    maxSessionHours: z.number().int().min(1).max(168),
    allowMultipleSessions: z.boolean(),
  }).optional(),
});
const DIGEST_CT = ['DEADLINE_SOON', 'IN_PROGRESS', 'OVERDUE', 'PENDING_APPROVAL', 'SUMMARY_BY_EMPLOYEE'] as const;
export const v1Digest = z.object({
  enabled: z.boolean(),
  sendWeekly: z.boolean(),
  sendMonthly: z.boolean(),
  sendDays: z.array(z.number().int().min(0).max(6)).default([]),
  sendHour: z.number().int().min(0).max(23),
  sendMinute: z.number().int().min(0).max(59),
  contentTypes: z.array(z.enum(DIGEST_CT)),
  recipientIds: z.array(z.string().cuid()).default([]),
  emailSubject: z.string().min(1).max(200),
  emailGreeting: z.string().max(500),
});
/** Luật thêm của route digest PATCH (sau zod) */
export function v1DigestRouteError(d: { enabled: boolean; sendDays: number[]; sendWeekly: boolean; sendMonthly: boolean; contentTypes: string[] }) {
  if (!d.enabled) return null;
  if (!(d.sendDays.length > 0 || d.sendWeekly || d.sendMonthly)) return 'schedule';
  if (d.contentTypes.length === 0) return 'content';
  return null;
}

// ── Payload V1 (component) ──
/** PriorityForm: onSave({ name, color, level, isDefault }) — level = Number(input) */
export const v1PriorityBody = (f: { name: string; color: string; level: string; isDefault: boolean }) =>
  ({ name: f.name, color: f.color, level: Number(f.level), isDefault: f.isDefault });
/** TaskTypeForm + TaskTypesSection: { name, icon, color: '#6B7280', description: description || undefined } → `?? undefined` */
export const v1TaskTypeBody = (f: { name: string; icon: string; description: string }) =>
  JSON.parse(JSON.stringify({ name: f.name, icon: f.icon, color: '#6B7280', description: (f.description || undefined) ?? undefined }));
/** ReportTemplatesSection.toInput */
export const v1TemplateBody = (f: { title: string; content: string; category: string; taskTypeId: string; isActive: boolean }) => ({
  title: f.title.trim(),
  content: f.content.trim(),
  category: f.category.trim() || null,
  taskTypeId: f.taskTypeId || null,
  isActive: f.isActive,
});
/** SmtpSection: gửi nguyên form (port = Number(input), password '' = giữ cũ) */
export const v1SmtpBody = (f: { host: string; port: string; secure: boolean; user: string; password: string; fromName: string; fromEmail: string; isActive: boolean }) => ({
  host: f.host, port: Number(f.port), secure: f.secure, user: f.user, password: f.password, fromName: f.fromName, fromEmail: f.fromEmail, isActive: f.isActive,
});
/** OverdueReminderSection.toggleCategory / toggleIndividualType: không cho bỏ mục cuối */
export function v1ToggleMin1<T>(current: T[], v: T): T[] {
  if (current.includes(v)) {
    if (current.length <= 1) return current;
    return current.filter((c) => c !== v);
  }
  return [...current, v];
}
/** DigestScheduleFields.setWeekdays / OverdueReminderSection.toggleWeekdays */
export function v1ToggleWeekdays(sendDays: number[]): number[] {
  const W = [1, 2, 3, 4, 5];
  const all = W.every((d) => sendDays.includes(d));
  return all ? sendDays.filter((d) => !W.includes(d)) : Array.from(new Set([...sendDays, ...W]));
}
/** NotificationSection.filteredEntries */
export function v1VisibleNotifTypes(types: Record<string, { roles: string[] }>, role: string, filter: 'all' | 'BOSS' | 'EMPLOYEE') {
  return Object.entries(types).filter(([, info]) => {
    if (role === 'EMPLOYEE') return info.roles.includes('EMPLOYEE');
    if (filter === 'all') return true;
    return info.roles.includes(filter);
  }).map(([k]) => k);
}

import { prisma } from '@/lib/prisma';
import type { EmailTemplateInput } from '../types';

// ─── Base layout builder ────────────────────────────────────────────────────
// accent: hex color for header gradient top
// badge: label in header pill
// icon: emoji or SVG string shown in header
// title: main heading
// body: HTML content inside the card

function emailBase({
  accent,
  accentDark,
  badgeText,
  icon,
  title,
  bodyHtml,
  ctaText,
  ctaUrl,
  footerNote,
}: {
  accent: string;
  accentDark: string;
  badgeText: string;
  icon: string;
  title: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  footerNote?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;min-height:100vh">
    <tr><td align="center" style="padding:32px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${accentDark} 0%,${accent} 100%);border-radius:14px 14px 0 0;padding:28px 32px 24px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.5px;margin-bottom:10px">⚡ TECHOPS</span>
                <div style="font-size:24px;margin-bottom:6px">${icon}</div>
                <h1 style="margin:0;font-size:18px;font-weight:800;color:#fff;line-height:1.3">${title}</h1>
              </td>
              <td align="right" valign="top">
                <span style="display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:600;color:#fff">${badgeText}</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
          ${bodyHtml}

          <!-- CTA Button -->
          <div style="margin-top:24px;text-align:center">
            <a href="${ctaUrl}"
               style="display:inline-block;padding:12px 32px;background:${accent};color:#fff;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none;letter-spacing:0.2px"
               target="_blank">${ctaText}</a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:16px 32px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">
                  Email này được gửi tự động từ <strong style="color:${accent}">TechOps</strong>.${footerNote ? '<br>' + footerNote : ''}<br>Vui lòng không trả lời email này.
                </p>
              </td>
              <td align="right">
                <a href="{{taskUrl}}" style="font-size:11px;color:${accent};text-decoration:none;font-weight:600" target="_blank">Mở TechOps →</a>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function greeting(): string {
  return `<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7">Xin chào <strong style="color:#111827">{{userName}}</strong>,</p>`;
}

function richTaskCard(extraRows?: string): string {
  return `
<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:16px 0">
  <!-- Task title -->
  <div style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
    <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px">Công việc</div>
    <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.4">{{taskTitle}}</div>
  </div>
  <!-- Info grid -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <tr>
      <td width="50%" style="padding:10px 16px;border-bottom:1px solid #f1f5f9;border-right:1px solid #f1f5f9;vertical-align:top">
        <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Mã task</div>
        <div style="font-size:12px;font-weight:700;color:#4f46e5;font-family:'Courier New',monospace">{{taskCode}}</div>
      </td>
      <td width="50%" style="padding:10px 16px;border-bottom:1px solid #f1f5f9;vertical-align:top">
        <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Trạng thái</div>
        <div style="font-size:12px;font-weight:600;color:#374151">{{statusLabel}}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;border-right:1px solid #f1f5f9;vertical-align:top">
        <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Ưu tiên</div>
        <div style="font-size:12px;font-weight:600">{{priority}}</div>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;vertical-align:top">
        <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Bắt đầu</div>
        <div style="font-size:12px;font-weight:600;color:#374151">{{scheduleStart}}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:10px 16px;vertical-align:top${extraRows ? ';border-bottom:1px solid #f1f5f9' : ''}">
        <div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">Deadline</div>
        <div style="font-size:13px;font-weight:700;color:#374151">{{deadline}}</div>
      </td>
    </tr>
    ${extraRows ?? ''}
  </table>
</div>`;
}

function extraRow(label: string, value: string): string {
  return `<tr><td colspan="2" style="padding:10px 16px;border-top:1px solid #f1f5f9;vertical-align:top"><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px">${label}</div><div style="font-size:12px;font-weight:600;color:#374151">${value}</div></td></tr>`;
}

function alertBox(text: string, bg: string, borderColor: string, textColor: string): string {
  return `<div style="background:${bg};border-left:3px solid ${borderColor};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;font-size:13px;color:${textColor};line-height:1.6">${text}</div>`;
}

// ─── Default templates ───────────────────────────────────────────────────────

const DEFAULTS: Record<string, { subject: string; body: string }> = {

  TASK_ASSIGNED: {
    subject: '[TechOps] Bạn có công việc mới: {{taskTitle}}',
    body: emailBase({
      accent: '#4f46e5', accentDark: '#312e81',
      badgeText: 'Công việc mới', icon: '📋',
      title: 'Bạn vừa được giao công việc',
      bodyHtml: greeting() +
        `<p style="margin:0 0 4px;font-size:13px;color:#4b5563;line-height:1.7">Một công việc mới vừa được giao cho bạn. Vui lòng xem xét và bắt đầu thực hiện.</p>` +
        richTaskCard(),
      ctaText: 'Xem công việc →', ctaUrl: '{{taskUrl}}',
    }),
  },

  TASK_APPROVED: {
    subject: '[TechOps] Công việc được duyệt: {{taskTitle}}',
    body: emailBase({
      accent: '#10b981', accentDark: '#065f46',
      badgeText: 'Đã duyệt', icon: '✅',
      title: 'Công việc của bạn được phê duyệt!',
      bodyHtml: greeting() +
        alertBox('Công việc đã được <strong>phê duyệt</strong>. Bạn có thể bắt đầu thực hiện ngay.', '#f0fdf4', '#10b981', '#166534') +
        richTaskCard(),
      ctaText: 'Bắt đầu thực hiện →', ctaUrl: '{{taskUrl}}',
    }),
  },

  TASK_REJECTED: {
    subject: '[TechOps] Công việc bị từ chối: {{taskTitle}}',
    body: emailBase({
      accent: '#ef4444', accentDark: '#7f1d1d',
      badgeText: 'Từ chối', icon: '❌',
      title: 'Công việc chưa được chấp nhận',
      bodyHtml: greeting() +
        alertBox('Công việc <strong>chưa đáp ứng yêu cầu</strong> và bị từ chối. Vui lòng xem lý do và cập nhật lại.', '#fef2f2', '#ef4444', '#7f1d1d') +
        richTaskCard(),
      ctaText: 'Xem lý do & cập nhật →', ctaUrl: '{{taskUrl}}',
    }),
  },

  TASK_COMPLETED: {
    subject: '[TechOps] Công việc đã được duyệt hoàn thành: {{taskTitle}}',
    body: emailBase({
      accent: '#10b981', accentDark: '#065f46',
      badgeText: 'Hoàn thành', icon: '🎉',
      title: 'Công việc đã được duyệt hoàn thành!',
      bodyHtml: greeting() +
        alertBox('Boss đã duyệt kết quả — công việc chính thức <strong>hoàn thành</strong>. Chúc mừng!', '#f0fdf4', '#10b981', '#166534') +
        richTaskCard(),
      ctaText: 'Xem chi tiết →', ctaUrl: '{{taskUrl}}',
    }),
  },

  PLAN_APPROVAL_REQUESTED: {
    subject: '[TechOps] Yêu cầu duyệt công việc: {{taskTitle}}',
    body: emailBase({
      accent: '#f59e0b', accentDark: '#78350f',
      badgeText: 'Chờ duyệt', icon: '📝',
      title: 'Có công việc chờ phê duyệt',
      bodyHtml: greeting() +
        `<p style="margin:0 0 4px;font-size:13px;color:#4b5563;line-height:1.7">Nhân viên <strong>{{assigneeName}}</strong> vừa gửi công việc và đang chờ bạn phê duyệt.</p>` +
        richTaskCard(extraRow('Người thực hiện', '{{assigneeName}}')),
      ctaText: 'Xem & Phê duyệt →', ctaUrl: '{{taskUrl}}',
    }),
  },

  REVIEW_REQUIRED: {
    subject: '[TechOps] Công việc cần review: {{taskTitle}}',
    body: emailBase({
      accent: '#8b5cf6', accentDark: '#4c1d95',
      badgeText: 'Cần review', icon: '🔍',
      title: 'Công việc đang chờ review',
      bodyHtml: greeting() +
        `<p style="margin:0 0 4px;font-size:13px;color:#4b5563;line-height:1.7">Nhân viên <strong>{{assigneeName}}</strong> đã hoàn thành và gửi công việc để bạn review.</p>` +
        richTaskCard(extraRow('Người thực hiện', '{{assigneeName}}')),
      ctaText: 'Review ngay →', ctaUrl: '{{taskUrl}}',
    }),
  },

  REVISION_REQUIRED: {
    subject: '[TechOps] Yêu cầu chỉnh sửa: {{taskTitle}}',
    body: emailBase({
      accent: '#f97316', accentDark: '#7c2d12',
      badgeText: 'Cần chỉnh sửa', icon: '✏️',
      title: 'Công việc cần được chỉnh sửa',
      bodyHtml: greeting() +
        alertBox('Quản lý yêu cầu bạn <strong>chỉnh sửa lại</strong> công việc. Vui lòng xem nhận xét và cập nhật.', '#fff7ed', '#f97316', '#7c2d12') +
        richTaskCard(),
      ctaText: 'Xem nhận xét & Chỉnh sửa →', ctaUrl: '{{taskUrl}}',
    }),
  },

  TRANSFER_RECEIVED: {
    subject: '[TechOps] Công việc được chuyển giao: {{taskTitle}}',
    body: emailBase({
      accent: '#0ea5e9', accentDark: '#0c4a6e',
      badgeText: 'Chuyển giao', icon: '🔄',
      title: 'Bạn nhận được công việc chuyển giao',
      bodyHtml: greeting() +
        `<p style="margin:0 0 4px;font-size:13px;color:#4b5563;line-height:1.7">Một công việc vừa được <strong>chuyển giao cho bạn</strong>. Vui lòng xem xét và tiếp nhận.</p>` +
        richTaskCard(),
      ctaText: 'Xem & Tiếp nhận →', ctaUrl: '{{taskUrl}}',
    }),
  },

  EXTENSION_REQUESTED: {
    subject: '[TechOps] Yêu cầu gia hạn: {{taskTitle}}',
    body: emailBase({
      accent: '#f59e0b', accentDark: '#78350f',
      badgeText: 'Yêu cầu gia hạn', icon: '⏳',
      title: 'Nhân viên yêu cầu gia hạn deadline',
      bodyHtml: greeting() +
        `<p style="margin:0 0 4px;font-size:13px;color:#4b5563;line-height:1.7"><strong>{{assigneeName}}</strong> vừa gửi yêu cầu gia hạn deadline cho công việc bên dưới. Vui lòng xem xét và quyết định.</p>` +
        richTaskCard(extraRow('Người thực hiện', '{{assigneeName}}')),
      ctaText: 'Xem & Quyết định →', ctaUrl: '{{taskUrl}}',
    }),
  },

  EXTENSION_APPROVED: {
    subject: '[TechOps] Gia hạn được chấp nhận: {{taskTitle}}',
    body: emailBase({
      accent: '#10b981', accentDark: '#065f46',
      badgeText: 'Gia hạn OK', icon: '📅',
      title: 'Yêu cầu gia hạn được chấp nhận',
      bodyHtml: greeting() +
        alertBox('Yêu cầu gia hạn deadline của bạn đã được <strong>chấp nhận</strong>. Deadline mới đã được cập nhật.', '#f0fdf4', '#10b981', '#166534') +
        richTaskCard(),
      ctaText: 'Xem công việc →', ctaUrl: '{{taskUrl}}',
    }),
  },

  EXTENSION_REJECTED: {
    subject: '[TechOps] Gia hạn bị từ chối: {{taskTitle}}',
    body: emailBase({
      accent: '#ef4444', accentDark: '#7f1d1d',
      badgeText: 'Từ chối gia hạn', icon: '⛔',
      title: 'Yêu cầu gia hạn bị từ chối',
      bodyHtml: greeting() +
        alertBox('Yêu cầu gia hạn deadline của bạn <strong>không được chấp nhận</strong>. Vui lòng đảm bảo hoàn thành đúng deadline gốc.', '#fef2f2', '#ef4444', '#7f1d1d') +
        richTaskCard(),
      ctaText: 'Xem công việc →', ctaUrl: '{{taskUrl}}',
    }),
  },

  DEADLINE_REMINDER: {
    subject: '[TechOps] Nhắc nhở deadline: {{taskTitle}}',
    body: emailBase({
      accent: '#f97316', accentDark: '#7c2d12',
      badgeText: 'Sắp hết hạn', icon: '⏰',
      title: 'Công việc sắp đến hạn!',
      bodyHtml: greeting() +
        alertBox('Công việc của bạn sẽ <strong>hết hạn vào {{deadline}}</strong>. Hãy đảm bảo hoàn thành và gửi review đúng hạn.', '#fff7ed', '#f97316', '#7c2d12') +
        richTaskCard(),
      ctaText: 'Xem công việc →', ctaUrl: '{{taskUrl}}',
      footerNote: 'Đây là nhắc nhở tự động 24h trước deadline.',
    }),
  },

  COMMENT_ADDED: {
    subject: '[TechOps] Bình luận mới trong: {{taskTitle}}',
    body: emailBase({
      accent: '#6366f1', accentDark: '#3730a3',
      badgeText: 'Bình luận mới', icon: '💬',
      title: 'Có bình luận mới trong công việc',
      bodyHtml: greeting() +
        `<p style="margin:0 0 4px;font-size:13px;color:#4b5563;line-height:1.7"><strong>{{commenterName}}</strong> vừa thêm bình luận trong công việc bên dưới.</p>` +
        richTaskCard(),
      ctaText: 'Xem bình luận →', ctaUrl: '{{taskUrl}}',
    }),
  },

  ALL_FAILED: {
    subject: '[TechOps] Tất cả người nhận từ chối: {{taskTitle}}',
    body: emailBase({
      accent: '#ef4444', accentDark: '#7f1d1d',
      badgeText: 'Cần xử lý', icon: '🚨',
      title: 'Toàn bộ người nhận đã từ chối',
      bodyHtml: greeting() +
        alertBox('Tất cả người nhận trong công việc <strong>{{taskTitle}}</strong> đều đã từ chối. Cần can thiệp ngay để phân công lại.', '#fef2f2', '#ef4444', '#7f1d1d') +
        richTaskCard(),
      ctaText: 'Xử lý ngay →', ctaUrl: '{{taskUrl}}',
    }),
  },
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const emailTemplateService = {
  async list() {
    const saved = await prisma.emailTemplate.findMany({ orderBy: { key: 'asc' } });
    const savedKeys = new Set(saved.map((t) => t.key));
    const defaults = Object.entries(DEFAULTS)
      .filter(([k]) => !savedKeys.has(k))
      .map(([key, { subject, body }]) => ({
        id: `default_${key}`,
        key,
        subject,
        body,
        isActive: true,
        updatedAt: new Date().toISOString(),
        isDefault: true,
      }));
    return [...saved.map((t) => ({ ...t, isDefault: false })), ...defaults];
  },

  /** Get single template by key — DB first, then DEFAULT */
  async getByKey(key: string): Promise<{ subject: string; body: string }> {
    const saved = await prisma.emailTemplate.findUnique({ where: { key } });
    if (saved) return { subject: saved.subject, body: saved.body };
    return DEFAULTS[key] ?? { subject: `[TechOps] ${key}`, body: '<p>Nội dung thông báo</p>' };
  },

  async upsert(key: string, data: EmailTemplateInput) {
    const existing = await prisma.emailTemplate.findUnique({ where: { key } });
    if (existing) return prisma.emailTemplate.update({ where: { key }, data });
    return prisma.emailTemplate.create({ data: { key, ...data } });
  },

  getDefault(key: string) {
    return DEFAULTS[key] ?? { subject: `[TechOps] ${key}`, body: '<p>Nội dung thông báo</p>' };
  },
};

import type { DigestData } from './digest-data.service';
import type { DigestContentType } from '../types';
import { statCard } from './digest-email.helpers';
import {
  buildDeadlineSoonCard,
  buildOverdueCard,
  buildPendingApprovalCard,
  buildInProgressCard,
  buildSummaryCard,
} from './digest-email.sections';

export function hasAnyData(data: DigestData, contentTypes: DigestContentType[]): boolean {
  const has = (t: DigestContentType) => contentTypes.includes(t);
  if (has('DEADLINE_SOON') && data.deadlineSoon.length > 0) return true;
  if (has('IN_PROGRESS') && data.inProgress.length > 0) return true;
  if (has('OVERDUE') && data.overdue.length > 0) return true;
  if (has('PENDING_APPROVAL') && data.pendingApproval.length > 0) return true;
  if (has('SUMMARY_BY_EMPLOYEE') && data.summaryByEmployee.length > 0) return true;
  return false;
}

export function buildDigestHtml(
  data: DigestData,
  contentTypes: DigestContentType[],
  subject: string,
  greeting: string,
  frequency: string,
  date: string,
  baseUrl: string,
): string {
  const has = (t: DigestContentType) => contentTypes.includes(t);
  const title = subject.replace('{date}', date);

  const cards = [
    has('DEADLINE_SOON') && data.deadlineSoon.length > 0 ? buildDeadlineSoonCard(data.deadlineSoon, baseUrl) : '',
    has('OVERDUE') && data.overdue.length > 0 ? buildOverdueCard(data.overdue, baseUrl) : '',
    has('PENDING_APPROVAL') && data.pendingApproval.length > 0 ? buildPendingApprovalCard(data.pendingApproval, baseUrl) : '',
    has('IN_PROGRESS') && data.inProgress.length > 0 ? buildInProgressCard(data.inProgress, baseUrl) : '',
    has('SUMMARY_BY_EMPLOYEE') && data.summaryByEmployee.length > 0 ? buildSummaryCard(data.summaryByEmployee) : '',
  ].filter(Boolean).join('\n');

  const statRow = [
    has('OVERDUE') ? statCard(data.overdue.length, 'Quá hạn', '#ef4444') : '',
    has('DEADLINE_SOON') ? statCard(data.deadlineSoon.length, 'Sắp hết hạn', '#f59e0b') : '',
    has('PENDING_APPROVAL') ? statCard(data.pendingApproval.length, 'Chờ duyệt', '#f59e0b') : '',
    has('IN_PROGRESS') ? statCard(data.inProgress.length, 'Đang làm', '#3b82f6') : '',
  ].filter(Boolean).join('');

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
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%">

        <tr><td>
          <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4f46e5 100%);border-radius:14px 14px 0 0;padding:32px 36px 28px">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:10px">
                  <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:8px;padding:5px 10px;font-size:13px;font-weight:700;color:#fff;letter-spacing:0.5px">⚡ TECHOPS</span>
                </div>
                <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff;line-height:1.3">${title}</h1>
                <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6)">${date} · Báo cáo ${frequency}</p>
              </td>
              <td align="right" valign="top">
                <span style="display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.9)">${frequency}</span>
              </td>
            </tr></table>
          </div>
        </td></tr>

        ${statRow ? `<tr><td style="background:#fff;padding:20px 36px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>${statRow}</tr></table>
        </td></tr>` : ''}

        <tr><td style="background:#fff;padding:${statRow ? '0' : '24px'} 36px 20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
          <p style="margin:0;padding:14px 16px;background:#f8fafc;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;font-size:13px;color:#374151;line-height:1.6">${greeting}</p>
        </td></tr>

        <tr><td style="background:#fff;padding:0 36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0">
        </td></tr>

        <tr><td style="background:#fff;padding:20px 36px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
          ${cards}
        </td></tr>

        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:18px 36px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">
                Email này được gửi tự động từ hệ thống <strong style="color:#6366f1">TechOps</strong>.<br>
                Vui lòng không trả lời email này.
              </p>
            </td>
            <td align="right">
              <a href="${baseUrl}" style="font-size:11px;color:#6366f1;text-decoration:none;font-weight:600" target="_blank">Mở TechOps →</a>
            </td>
          </tr></table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

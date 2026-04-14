import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import dayjs from '@/lib/date';

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}

interface OverdueTask {
  id: string;
  title: string;
  taskCode: string | null;
  scheduleEnd: Date;
  assigneeName: string;
  daysOverdue: number;
}

function buildTaskRows(tasks: OverdueTask[], baseUrl: string): string {
  return tasks.map((t, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
      <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827">${escHtml(t.title)}</td>
      <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#4f46e5;font-family:'Courier New',monospace">${t.taskCode ? escHtml(t.taskCode) : '—'}</td>
      <td style="padding:10px 14px;font-size:12px;color:#4b5563">${escHtml(t.assigneeName)}</td>
      <td style="padding:10px 14px;text-align:center">
        <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#fef2f2;color:#dc2626">
          Quá ${t.daysOverdue} ngày
        </span>
      </td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280">${dayjs(t.scheduleEnd).format('DD/MM/YYYY')}</td>
      <td style="padding:10px 14px;text-align:center">
        <a href="${baseUrl}/tasks/${escHtml(t.id)}"
           style="display:inline-block;padding:4px 12px;background:#f3f4f6;color:#4b5563;font-size:11px;font-weight:600;border-radius:6px;text-decoration:none;border:1px solid #e5e7eb"
           target="_blank">Xem →</a>
      </td>
    </tr>`).join('');
}

function buildSectionCard(accent: string, icon: string, title: string, count: number, tableRows: string): string {
  const headers = ['Tên công việc','Mã task','Người thực hiện','Trạng thái','Deadline',''].map((h) =>
    `<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;background:#f9fafb;white-space:nowrap">${h}</th>`
  ).join('');

  return `
  <div style="margin-bottom:20px;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="padding:14px 18px;background:${accent};display:table;width:100%;box-sizing:border-box">
      <div style="display:table-cell;vertical-align:middle">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;padding-right:10px;font-size:16px">${icon}</td>
          <td style="vertical-align:middle;font-size:14px;font-weight:800;color:#fff;letter-spacing:0.2px;text-transform:uppercase">${title}</td>
        </tr></table>
      </div>
      <div style="display:table-cell;vertical-align:middle;text-align:right">
        <span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,0.22);border-radius:20px;font-size:12px;font-weight:700;color:#fff">${count} công việc</span>
      </div>
    </div>
    <div style="overflow-x:auto;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">
        <thead><tr>${headers}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </div>`;
}

function buildOverdueEmail(
  pendingApproval: OverdueTask[],
  pendingReview: OverdueTask[],
  date: string,
  baseUrl: string,
): string {
  const totalCount = pendingApproval.length + pendingReview.length;

  const sections: string[] = [];
  if (pendingApproval.length > 0) {
    sections.push(buildSectionCard('#f59e0b', '📝', 'Chờ phê duyệt', pendingApproval.length, buildTaskRows(pendingApproval, baseUrl)));
  }
  if (pendingReview.length > 0) {
    sections.push(buildSectionCard('#8b5cf6', '🔍', 'Chờ review', pendingReview.length, buildTaskRows(pendingReview, baseUrl)));
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;min-height:100vh">
<tr><td align="center" style="padding:32px 16px">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#7f1d1d 0%,#b91c1c 40%,#ef4444 100%);border-radius:14px 14px 0 0;padding:28px 32px 24px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.5px;margin-bottom:10px">⚡ TECHOPS</span>
        <div style="font-size:24px;margin-bottom:6px">🚨</div>
        <h1 style="margin:0;font-size:18px;font-weight:800;color:#fff;line-height:1.3">Nhắc nhở: Công việc quá hạn chưa xử lý</h1>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7)">${date} · Cần xử lý ngay</p>
      </td>
      <td align="right" valign="top">
        <span style="display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;color:#fff">${totalCount} việc tồn đọng</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- Stats -->
  <tr><td style="background:#fff;padding:20px 32px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto">
      <tr>
        <td style="padding:0 6px">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 24px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#f59e0b;line-height:1">${pendingApproval.length}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500">Chờ phê duyệt</div>
          </div>
        </td>
        <td style="padding:0 6px">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 24px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#8b5cf6;line-height:1">${pendingReview.length}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500">Chờ review</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="background:#fff;padding:0 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0">
  </td></tr>

  <!-- Content -->
  <tr><td style="background:#fff;padding:20px 32px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    ${sections.join('\n')}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:16px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">Email tự động từ <strong style="color:#ef4444">TechOps</strong>.<br>Vui lòng không trả lời email này.</p></td>
      <td align="right"><a href="${baseUrl}" style="font-size:11px;color:#ef4444;text-decoration:none;font-weight:600" target="_blank">Mở TechOps →</a></td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function startOverdueReminderCron(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const db = prisma as unknown as { overdueReminderConfig: { findUnique: (a: unknown) => Promise<Record<string,unknown> | null> } };
      const config = await db.overdueReminderConfig.findUnique({ where: { id: 'singleton' } });
      if (!config?.enabled) return;

      const sendDays: number[] = Array.isArray(config.sendDays) ? (config.sendDays as number[]) : [1,2,3,4,5];
      if (sendDays.length === 0) return;

      const nowVn = dayjs.tz();
      if (nowVn.hour() !== (config.sendHour as number) || nowVn.minute() !== (config.sendMinute as number)) return;
      if (!sendDays.includes(nowVn.day())) return;

      const today = nowVn.startOf('day').toDate();

      const [rawPendingApproval, rawPendingReview, bosses] = await Promise.all([
        prisma.task.findMany({
          where: { isDeleted: false, status: 'PENDING_APPROVAL', scheduleEnd: { lt: today } },
          select: {
            id: true, title: true, taskCode: true, scheduleEnd: true,
            assignees: { where: { status: { notIn: ['REJECTED','TRANSFERRED'] } }, select: { user: { select: { displayName: true } } }, take: 1 },
          },
          orderBy: { scheduleEnd: 'asc' },
        }),
        prisma.task.findMany({
          where: { isDeleted: false, status: 'PENDING_REVIEW', scheduleEnd: { lt: today } },
          select: {
            id: true, title: true, taskCode: true, scheduleEnd: true,
            assignees: { where: { status: { notIn: ['REJECTED','TRANSFERRED'] } }, select: { user: { select: { displayName: true } } }, take: 1 },
          },
          orderBy: { scheduleEnd: 'asc' },
        }),
        prisma.user.findMany({
          where: { isActive: true, role: { name: { in: ['BOSS','ADMIN'] } } },
          select: { email: true, displayName: true },
        }),
      ]);

      if (rawPendingApproval.length === 0 && rawPendingReview.length === 0) {
        console.log('📭 No overdue tasks to remind');
        return;
      }

      const toTask = (t: typeof rawPendingApproval[number]): OverdueTask => ({
        id: t.id,
        title: t.title,
        taskCode: t.taskCode,
        scheduleEnd: t.scheduleEnd!,
        assigneeName: t.assignees[0]?.user.displayName ?? '—',
        daysOverdue: nowVn.diff(dayjs(t.scheduleEnd), 'day'),
      });

      const pendingApproval = rawPendingApproval.map(toTask);
      const pendingReview = rawPendingReview.map(toTask);

      const date = nowVn.format('DD/MM/YYYY');
      const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
      const html = buildOverdueEmail(pendingApproval, pendingReview, date, baseUrl);
      const subject = `[TechOps] Nhắc nhở: ${pendingApproval.length + pendingReview.length} công việc quá hạn chưa xử lý - ${date}`;

      let sent = 0;
      for (const boss of bosses) {
        if (!boss.email) continue;
        await sendEmail({ to: boss.email, subject, html });
        sent++;
      }

      console.log(`✅ Overdue reminder sent to ${sent} recipient(s) (${pendingApproval.length} pending approval, ${pendingReview.length} pending review)`);
    } catch (err) {
      console.error('❌ Overdue reminder cron error:', err);
    }
  });

  console.log('✅ Overdue reminder cron started (checking every minute)');
}

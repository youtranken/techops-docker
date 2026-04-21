import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import dayjs from '@/lib/date';
import { notificationPrefsService } from '@/modules/settings/services/notification-prefs.service';
import { getRedis } from '@/lib/redis';
import type { AssigneeStatus, Prisma } from '@prisma/client';

const LOCK_KEY = 'lock:cron:overdue-reminder';
const LOCK_TTL = 55; // giây

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

// ─── Boss digest email builders ───────────────────────────────────────────────

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
  inProgress: OverdueTask[],
  waitingAck: OverdueTask[],
  date: string,
  baseUrl: string,
): string {
  const totalCount = pendingApproval.length + pendingReview.length + inProgress.length + waitingAck.length;

  const sections: string[] = [];
  if (pendingApproval.length > 0) {
    sections.push(buildSectionCard('#f59e0b', '📝', 'Chờ phê duyệt', pendingApproval.length, buildTaskRows(pendingApproval, baseUrl)));
  }
  if (pendingReview.length > 0) {
    sections.push(buildSectionCard('#8b5cf6', '🔍', 'Chờ review', pendingReview.length, buildTaskRows(pendingReview, baseUrl)));
  }
  if (inProgress.length > 0) {
    sections.push(buildSectionCard('#3b82f6', '⏳', 'Đang thực hiện (quá hạn)', inProgress.length, buildTaskRows(inProgress, baseUrl)));
  }
  if (waitingAck.length > 0) {
    sections.push(buildSectionCard('#10b981', '📬', 'Chờ xác nhận (quá hạn)', waitingAck.length, buildTaskRows(waitingAck, baseUrl)));
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
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 20px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#f59e0b;line-height:1">${pendingApproval.length}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500">Chờ phê duyệt</div>
          </div>
        </td>
        <td style="padding:0 6px">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 20px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#8b5cf6;line-height:1">${pendingReview.length}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500">Chờ review</div>
          </div>
        </td>
        <td style="padding:0 6px">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 20px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#3b82f6;line-height:1">${inProgress.length}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500">Đang thực hiện</div>
          </div>
        </td>
        <td style="padding:0 6px">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 20px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#10b981;line-height:1">${waitingAck.length}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500">Chờ xác nhận</div>
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

// ─── Individual assignee email builders ───────────────────────────────────────

/** Email nhắc cá nhân cho assignee: đã quá hạn hoặc sắp quá hạn */
function buildAssigneeReminderEmail(opts: {
  recipientName: string;
  taskTitle: string;
  taskCode: string | null;
  taskId: string;
  scheduleEnd: Date;
  kind: 'overdue' | 'pending_ack' | 'upcoming';
  baseUrl: string;
}): { subject: string; html: string } {
  const { recipientName, taskTitle, taskCode, taskId, scheduleEnd, kind, baseUrl } = opts;
  const deadlineStr = dayjs(scheduleEnd).format('DD/MM/YYYY HH:mm');

  const configs = {
    overdue: {
      subject: `[TechOps] Công việc quá hạn — ${taskCode ?? taskTitle}`,
      headerBg: 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 100%)',
      icon: '🚨',
      headline: 'Công việc của bạn đã quá hạn',
      body: `Công việc <strong>${escHtml(taskTitle)}</strong> đã quá deadline <strong>${deadlineStr}</strong>.<br>
             Vui lòng hoàn thành và gửi báo cáo ngay.`,
      ctaLabel: 'Xem & Báo cáo',
      ctaBg: '#dc2626',
    },
    pending_ack: {
      subject: `[TechOps] Bạn chưa tiếp nhận công việc đã quá hạn — ${taskCode ?? taskTitle}`,
      headerBg: 'linear-gradient(135deg,#92400e 0%,#d97706 100%)',
      icon: '⚠️',
      headline: 'Bạn chưa tiếp nhận công việc đã quá hạn',
      body: `Bạn được giao công việc <strong>${escHtml(taskTitle)}</strong> nhưng <strong>chưa tiếp nhận</strong>.<br>
             Deadline đã là <strong>${deadlineStr}</strong> (đã qua).<br>
             Vui lòng tiếp nhận hoặc liên hệ người giao việc ngay.`,
      ctaLabel: 'Tiếp nhận ngay',
      ctaBg: '#d97706',
    },
    upcoming: {
      subject: `[TechOps] Nhắc deadline sắp đến — ${taskCode ?? taskTitle}`,
      headerBg: 'linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)',
      icon: '⏰',
      headline: 'Deadline công việc của bạn sắp đến',
      body: `Công việc <strong>${escHtml(taskTitle)}</strong> sẽ đến hạn vào <strong>${deadlineStr}</strong>.<br>
             Hãy đảm bảo hoàn thành đúng hạn.`,
      ctaLabel: 'Xem công việc',
      ctaBg: '#3b82f6',
    },
  } as const;

  const c = configs[kind];
  const codeTag = taskCode
    ? `<span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;padding:1px 8px;font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#4f46e5">${escHtml(taskCode)}</span>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;min-height:100vh">
<tr><td align="center" style="padding:32px 16px">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%">

  <tr><td style="background:${c.headerBg};border-radius:14px 14px 0 0;padding:28px 32px 24px">
    <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.5px;margin-bottom:10px">⚡ TECHOPS</span>
    <div style="font-size:28px;margin-bottom:8px">${c.icon}</div>
    <h1 style="margin:0;font-size:18px;font-weight:800;color:#fff;line-height:1.3">${c.headline}</h1>
  </td></tr>

  <tr><td style="background:#fff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    <p style="margin:0 0 16px;font-size:14px;color:#374151">Xin chào <strong>${escHtml(recipientName)}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6">${c.body}</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin-bottom:24px">
      <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:4px">${escHtml(taskTitle)} ${codeTag}</div>
      <div style="font-size:12px;color:#6b7280">Deadline: ${deadlineStr}</div>
    </div>

    <a href="${baseUrl}/tasks/${escHtml(taskId)}"
       style="display:inline-block;padding:10px 24px;background:${c.ctaBg};color:#fff;font-size:13px;font-weight:700;border-radius:8px;text-decoration:none"
       target="_blank">${c.ctaLabel} →</a>
  </td></tr>

  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:14px 32px">
    <p style="margin:0;font-size:11px;color:#94a3b8">Email tự động từ <strong style="color:#ef4444">TechOps</strong>. Vui lòng không trả lời.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject: c.subject, html };
}

// ─── Cron job ─────────────────────────────────────────────────────────────────

export function startOverdueReminderCron(): void {
  cron.schedule('* * * * *', async () => {
    const redis = getRedis();
    let acquired = false;
    try {
      acquired = !!(await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX'));
    } catch { /* Redis down — skip */ }
    if (!acquired) return;

    try {
      const db = prisma as unknown as { overdueReminderConfig: { findUnique: (a: unknown) => Promise<Record<string,unknown> | null> } };
      const config = await db.overdueReminderConfig.findUnique({ where: { id: 'singleton' } });
      if (!config?.enabled) return;

      const sendDays: number[] = Array.isArray(config.sendDays)
        ? (config.sendDays as unknown[]).map(Number).filter((n) => !isNaN(n))
        : [1, 2, 3, 4, 5];
      if (sendDays.length === 0) return;

      const digestCategories: string[] = Array.isArray(config.digestCategories)
        ? (config.digestCategories as unknown[]).map(String)
        : ['PENDING_APPROVAL', 'PENDING_REVIEW', 'IN_PROGRESS', 'WAITING_ACKNOWLEDGE'];

      const individualEmailTypes: string[] = Array.isArray(config.individualEmailTypes)
        ? (config.individualEmailTypes as unknown[]).map(String)
        : ['OVERDUE', 'PENDING_ACK', 'UPCOMING'];

      const nowVn = dayjs.tz();
      if (nowVn.hour() !== Number(config.sendHour) || nowVn.minute() !== Number(config.sendMinute)) return;
      if (!sendDays.includes(nowVn.day())) return;

      const today = nowVn.startOf('day').toDate();
      const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');

      // ── 1. Boss digest ──────────────────────────────────────────────────────
      const overdueSelect = {
        id: true, title: true, taskCode: true, scheduleEnd: true,
        assignees: { where: { status: { notIn: ['REJECTED','TRANSFERRED'] as AssigneeStatus[] } }, select: { user: { select: { displayName: true } } }, take: 1 },
      };

      const queryOverdueTasks = (status: string) =>
        prisma.task.findMany({
          where: { status: status as 'IN_PROGRESS', scheduleEnd: { lt: today } },
          select: overdueSelect,
          orderBy: { scheduleEnd: 'asc' },
        });

      const [rawPendingApproval, rawPendingReview, rawInProgress, rawWaitingAck, bosses] = await Promise.all([
        digestCategories.includes('PENDING_APPROVAL')    ? queryOverdueTasks('PENDING_APPROVAL')    : Promise.resolve([]),
        digestCategories.includes('PENDING_REVIEW')      ? queryOverdueTasks('PENDING_REVIEW')      : Promise.resolve([]),
        digestCategories.includes('IN_PROGRESS')         ? queryOverdueTasks('IN_PROGRESS')         : Promise.resolve([]),
        digestCategories.includes('WAITING_ACKNOWLEDGE') ? queryOverdueTasks('WAITING_ACKNOWLEDGE') : Promise.resolve([]),
        prisma.user.findMany({
          where: { isActive: true, role: { name: { in: ['BOSS','ADMIN'] } } },
          select: { email: true, displayName: true },
        }),
      ]);

      const hasOverdue = rawPendingApproval.length > 0 || rawPendingReview.length > 0 ||
                         rawInProgress.length > 0 || rawWaitingAck.length > 0;

      const toTask = (t: typeof rawPendingApproval[number]): OverdueTask => ({
        id: t.id,
        title: t.title,
        taskCode: t.taskCode,
        scheduleEnd: t.scheduleEnd!,
        assigneeName: t.assignees[0]?.user.displayName ?? '—',
        daysOverdue: nowVn.diff(dayjs(t.scheduleEnd), 'day'),
      });

      const pendingApproval = rawPendingApproval.map(toTask);
      const pendingReview   = rawPendingReview.map(toTask);
      const inProgress      = rawInProgress.map(toTask);
      const waitingAck      = rawWaitingAck.map(toTask);

      // Check shared prefs một lần cho cả boss digest và assignee emails
      const sharedPrefs = await notificationPrefsService.getShared();
      const deadlineEmailEnabled = sharedPrefs.emailEnabled && sharedPrefs.emailTypes.includes('DEADLINE_REMINDER');

      // ── 1a. Boss digest (chỉ gửi khi có task overdue) ──────────────────────
      let bossSent = 0;
      if (hasOverdue) {
        const date = nowVn.format('DD/MM/YYYY');
        const html = buildOverdueEmail(pendingApproval, pendingReview, inProgress, waitingAck, date, baseUrl);
        const totalOverdue = pendingApproval.length + pendingReview.length + inProgress.length + waitingAck.length;
        const subject = `[TechOps] Nhắc nhở: ${totalOverdue} công việc quá hạn chưa xử lý - ${date}`;

        if (deadlineEmailEnabled) {
          for (const boss of bosses) {
            if (!boss.email) continue;
            await sendEmail({ to: boss.email, subject, html });
            bossSent++;
          }
        } else {
          console.log('📪 Boss overdue digest skipped: disabled by notification prefs');
        }
      } else {
        console.log('📭 No overdue tasks — boss digest skipped');
      }

      // ── 2. Individual assignee emails ───────────────────────────────────────
      // Nhóm A: Assignee đang IN_PROGRESS quá hạn
      // Nhóm B: Assignee PENDING chưa tiếp nhận (task WAITING_ACKNOWLEDGE) quá hạn
      // Nhóm C: Assignee sắp đến hạn trong 24h (cảnh báo sớm)
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 3_600_000);

      // Helper query cho mỗi nhóm
      // Dùng AND để tránh clobber OR nếu extraWhere cũng có OR key
      const queryAssigneeGroup = (
        extraWhere: Prisma.TaskAssigneeWhereInput,
      ) => prisma.taskAssignee.findMany({
        where: {
          AND: [
            extraWhere,
            {
              OR: [
                { lastOverdueReminderSentAt: null },
                { lastOverdueReminderSentAt: { lt: today } },
              ],
            },
          ],
        } as unknown as Prisma.TaskAssigneeWhereInput,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          task: { select: { id: true, title: true, taskCode: true, scheduleEnd: true, createdAt: true } },
        },
      });

      const MS_24H = 24 * 3_600_000;

      const [groupARaw, groupBRaw, groupCRaw] = await Promise.all([
        // Nhóm A: IN_PROGRESS quá hạn
        individualEmailTypes.includes('OVERDUE')
          ? queryAssigneeGroup({ status: 'IN_PROGRESS' as AssigneeStatus, task: { status: 'IN_PROGRESS', scheduleEnd: { lt: now } } })
          : Promise.resolve([]),
        // Nhóm B: PENDING chưa tiếp nhận, quá hạn
        individualEmailTypes.includes('PENDING_ACK')
          ? queryAssigneeGroup({ status: 'PENDING' as AssigneeStatus, task: { status: 'WAITING_ACKNOWLEDGE', scheduleEnd: { lt: now } } })
          : Promise.resolve([]),
        // Nhóm C: sắp quá hạn trong 24h (chưa overdue)
        individualEmailTypes.includes('UPCOMING')
          ? queryAssigneeGroup({
              status: { in: ['IN_PROGRESS', 'PENDING'] as AssigneeStatus[] },
              task: { status: { in: ['IN_PROGRESS', 'WAITING_ACKNOWLEDGE'] }, scheduleEnd: { gte: now, lt: in24h } },
            })
          : Promise.resolve([]),
      ]);

      // Option A: chỉ nhắc "sắp đến hạn" nếu task có ít nhất 24h làm (scheduleEnd - createdAt >= 24h)
      const groupA = groupARaw;
      const groupB = groupBRaw;
      const groupC = groupCRaw.filter((row) => {
        const { scheduleEnd, createdAt } = row.task;
        if (!scheduleEnd || !createdAt) return false;
        return scheduleEnd.getTime() - createdAt.getTime() >= MS_24H;
      });

      let assigneeSent = 0;
      const assigneeIdsToUpdate: string[] = [];

      const sendAssigneeEmail = async (
        row: typeof groupA[number],
        kind: 'overdue' | 'pending_ack' | 'upcoming',
      ) => {
        if (!row.user.email) return;
        // Shared prefs: nếu toàn hệ thống tắt DEADLINE_REMINDER thì skip
        if (!deadlineEmailEnabled) return;
        // Per-user notification prefs gate
        const canSend = await notificationPrefsService.shouldSendEmail(row.user.id, 'DEADLINE_REMINDER');
        if (!canSend) return;

        const { subject: subj, html: body } = buildAssigneeReminderEmail({
          recipientName: row.user.displayName,
          taskTitle: row.task.title,
          taskCode: row.task.taskCode,
          taskId: row.task.id,
          scheduleEnd: row.task.scheduleEnd!,
          kind,
          baseUrl,
        });

        try {
          await sendEmail({ to: row.user.email, subject: subj, html: body });
          assigneeIdsToUpdate.push(row.id);
          assigneeSent++;
        } catch (err) {
          console.error(`[overdue-reminder] Email failed for assignee ${row.id}:`, err);
        }
      };

      for (const row of groupA) await sendAssigneeEmail(row, 'overdue');
      for (const row of groupB) await sendAssigneeEmail(row, 'pending_ack');
      for (const row of groupC) await sendAssigneeEmail(row, 'upcoming');

      // Cập nhật lastOverdueReminderSentAt để chống spam
      // Tách try/catch riêng: dù DB update thất bại, cron không bị crash
      // nhưng log lại để biết — lần chạy tiếp có thể gửi lại cho cùng assignee
      if (assigneeIdsToUpdate.length > 0) {
        try {
          await (prisma.taskAssignee.updateMany as Function)({
            where: { id: { in: assigneeIdsToUpdate } },
            // lastOverdueReminderSentAt added by migration — remove cast after `prisma generate`
            data: { lastOverdueReminderSentAt: new Date() },
          });
        } catch (updateErr) {
          console.error(
            `[overdue-reminder] Failed to update lastOverdueReminderSentAt for ${assigneeIdsToUpdate.length} assignees — ` +
            'next run may resend emails:',
            updateErr,
          );
        }
      }

      console.log(
        `✅ Overdue reminder: boss=${bossSent}, assignee=${assigneeSent} ` +
        `(A=${groupA.length} overdue, B=${groupB.length} pending-ack, C=${groupC.length} upcoming)`,
      );
    } catch (err) {
      console.error('❌ Overdue reminder cron error:', err);
    } finally {
      try { await redis.del(LOCK_KEY); } catch { /* ignore */ }
    }
  });

  console.log('✅ Overdue reminder cron started (checking every minute)');
}

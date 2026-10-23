'use client';

import type { TaskStatus } from '@prisma/client';
import { StatusDot } from '@/shared/ui/StatusDot';
import type { TaskDetail } from '../../services/task-query.service';

type Log      = TaskDetail['auditLogs'][number];
type Assignee = TaskDetail['assignees'][number];

type Tone = 'positive' | 'negative' | 'neutral';

const ACTION_CFG: Record<string, { label: string; tone: Tone }> = {
  TASK_CREATED:        { label: 'Tạo công việc',        tone: 'neutral'  },
  TASK_UPDATED:        { label: 'Cập nhật',             tone: 'neutral'  },
  TASK_CANCELLED:      { label: 'Hủy công việc',        tone: 'negative' },
  TASK_DELETED:        { label: 'Xóa công việc',        tone: 'negative' },
  PLAN_APPROVED:       { label: 'Duyệt công việc',      tone: 'positive' },
  PLAN_REJECTED:       { label: 'Từ chối công việc',    tone: 'negative' },
  ACKNOWLEDGED:        { label: 'Tiếp nhận',            tone: 'positive' },
  REJECTED:            { label: 'Từ chối nhận',         tone: 'negative' },
  COMPLETED:           { label: 'Hoàn thành',           tone: 'positive' },
  REVIEW_APPROVED:     { label: 'Duyệt KQ hoàn thành', tone: 'positive' },
  REVIEW_REJECTED:     { label: 'Yêu cầu làm lại',     tone: 'negative' },
  TRANSFERRED:         { label: 'Chuyển giao',   tone: 'neutral'  },
  REASSIGNED:          { label: 'Phân công lại', tone: 'neutral'  },
  EXTENSION_REQUESTED: { label: 'Xin gia hạn',          tone: 'neutral'  },
  EXTENSION_APPROVED:  { label: 'Duyệt gia hạn',        tone: 'positive' },
  EXTENSION_REJECTED:  { label: 'Từ chối gia hạn',      tone: 'negative' },
  EXTENSION_WITHDRAWN: { label: 'Rút yêu cầu gia hạn', tone: 'neutral'  },
  FORCE_MODE_TOGGLED:  { label: 'Force Mode',           tone: 'neutral'  },
  STATUS_CHANGED:      { label: 'Đổi trạng thái',       tone: 'neutral'  },
};

const TONE_DOT: Record<Tone, string> = {
  positive: 'bg-c-done',
  negative: 'bg-danger',
  neutral:  'bg-line-2',
};

function fmt(d: Date | string) {
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getContext(log: Log, assignees: Assignee[]): string | null {
  const d = (log.details ?? {}) as Record<string, unknown>;
  const names = assignees.map((a) => a.user.displayName).join(', ');
  // Map user.id → displayName (dùng cho TRANSFERRED, REASSIGNED)
  const userIdToName = Object.fromEntries(assignees.map((a) => [a.user.id, a.user.displayName]));
  // Map assignee record id → displayName (dùng cho REVIEW_REJECTED)
  const assigneeIdToName = Object.fromEntries(assignees.map((a) => [a.id, a.user.displayName]));

  switch (log.action) {
    case 'TASK_CREATED':        return names ? `Giao cho: ${names}` : null;
    case 'PLAN_APPROVED':       return names ? `Chờ tiếp nhận bởi: ${names}` : null;
    case 'PLAN_REJECTED':
    case 'REJECTED':
    case 'TASK_CANCELLED':      return d.reason ? `Lý do: "${d.reason}"` : null;
    case 'COMPLETED':           return 'Đã gửi báo cáo hoàn thành';
    case 'REVIEW_REJECTED': {
      const entries = d.entries as { assigneeId?: string; reason?: string }[] | undefined;
      if (!entries?.length) return null;
      return entries.filter((e) => e.reason).map((e) => `${e.assigneeId ? (assigneeIdToName[e.assigneeId] ?? 'Assignee') : 'Tất cả'}: "${e.reason}"`).join(' · ');
    }
    case 'TRANSFERRED': {
      // Case phục hồi: người nhận từ chối → trả lại người giao gốc
      if (d.isRestore) {
        const restoredName = (d.restoredToName as string | undefined) ?? userIdToName[d.restoredTo as string];
        const rejectedName = d.rejectedByName as string | undefined;
        const parts: string[] = [];
        if (rejectedName) parts.push(`${rejectedName} từ chối nhận`);
        if (restoredName) parts.push(`Trả lại: ${restoredName}`);
        return parts.join(' — ') || 'Người nhận từ chối — phục hồi người giao';
      }
      // Case chuyển giao thông thường
      const parts: string[] = [];
      const toName = (d.transferToName as string | undefined) ?? userIdToName[d.transferTo as string];
      if (toName) parts.push(`Chuyển cho: ${toName}`);
      if (d.notes) parts.push(`Ghi chú: "${d.notes}"`);
      return parts.join(' · ') || null;
    }
    case 'REASSIGNED': {
      const ids = d.newAssigneeIds as string[] | undefined;
      if (!ids?.length) return null;
      const resolvedNames = ids.map((uid) => userIdToName[uid] ?? uid).filter(Boolean);
      return resolvedNames.length ? `Giao lại cho: ${resolvedNames.join(', ')}` : null;
    }
    case 'EXTENSION_REQUESTED': return [d.requestedDate ? `Đề xuất: ${fmtDate(d.requestedDate as string)}` : null, d.reason ? `Lý do: "${d.reason}"` : null].filter(Boolean).join(' · ') || null;
    case 'EXTENSION_APPROVED':  return d.newDeadline ? `Deadline mới: ${fmtDate(d.newDeadline as string)}` : null;
    case 'EXTENSION_REJECTED':  return d.reason ? `Lý do: "${d.reason}"` : null;
    case 'TASK_UPDATED': {
      const changes = d.changes as { field: string; oldValue: string; newValue: string }[] | undefined;
      if (!changes?.length) return null;
      return changes.map((c) => {
        if (c.field === 'Nội dung') return 'Đã cập nhật nội dung';
        if (!c.oldValue) return `${c.field}: thêm ${c.newValue}`;
        if (!c.newValue) return `${c.field}: xóa ${c.oldValue}`;
        return `${c.field}: "${c.oldValue}" → "${c.newValue}"`;
      }).join('\n');
    }
    default: return null;
  }
}

interface Props { log: Log; assignees: Assignee[] }

/** Một dòng Lịch sử (preview `.hist li`). Nhãn + diễn giải giữ nguyên chữ V1 (dịch ở lát sau). */
export function AuditLogEntry({ log, assignees }: Props) {
  const cfg = ACTION_CFG[log.action] ?? { label: log.action, tone: 'neutral' as Tone };
  const context = getContext(log, assignees);
  const showStatus = !!log.newStatus && log.oldStatus !== log.newStatus && log.action !== 'COMPLETED';
  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-3 pb-3.5 pl-5 before:absolute before:bottom-[-2px] before:left-[3px] before:top-3.5 before:w-px before:bg-line before:content-[''] last:before:hidden">
      <span aria-hidden className={`absolute left-0 top-[7px] size-[7px] rounded-full ${TONE_DOT[cfg.tone]}`} />
      <div className="min-w-0 text-sm text-ink-2 [overflow-wrap:anywhere]">
        <p className="m-0"><b className="font-medium text-ink">{log.performedBy.displayName}</b> · {cfg.label}
          {showStatus && <> → <StatusDot status={log.newStatus as TaskStatus} className="align-middle text-xs" /></>}
        </p>
        {context && context.split('\n').map((line, i) => (
          <p key={i} className="m-0 mt-0.5 text-[13px] text-ink-3">{line}</p>
        ))}
      </div>
      <time className="whitespace-nowrap pt-0.5 font-mono text-xs text-ink-3">{fmt(log.createdAt)}</time>
    </li>
  );
}

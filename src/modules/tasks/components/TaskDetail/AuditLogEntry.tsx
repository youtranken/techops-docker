'use client';

import type { TaskStatus } from '@prisma/client';
import { TaskStatusBadge } from '../TaskCard/TaskStatusBadge';
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
  TRANSFERRED:         { label: 'Chuyển giao',          tone: 'neutral'  },
  REASSIGNED:          { label: 'Phân công lại',        tone: 'neutral'  },
  EXTENSION_REQUESTED: { label: 'Xin gia hạn',          tone: 'neutral'  },
  EXTENSION_APPROVED:  { label: 'Duyệt gia hạn',        tone: 'positive' },
  EXTENSION_REJECTED:  { label: 'Từ chối gia hạn',      tone: 'negative' },
  EXTENSION_WITHDRAWN: { label: 'Rút yêu cầu gia hạn', tone: 'neutral'  },
  FORCE_MODE_TOGGLED:  { label: 'Force Mode',           tone: 'neutral'  },
  STATUS_CHANGED:      { label: 'Đổi trạng thái',       tone: 'neutral'  },
};

const TONE_PILL: Record<Tone, string> = {
  positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  negative: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  neutral:  'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400',
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
      const idToName = Object.fromEntries(assignees.map((a) => [a.id, a.user.displayName]));
      return entries.filter((e) => e.reason).map((e) => `${e.assigneeId ? (idToName[e.assigneeId] ?? 'Assignee') : 'Tất cả'}: "${e.reason}"`).join(' · ');
    }
    case 'TRANSFERRED':         return d.notes ? `Ghi chú: "${d.notes}"` : null;
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

export function AuditLogEntry({ log, assignees }: Props) {
  const cfg        = ACTION_CFG[log.action] ?? { label: log.action, tone: 'neutral' as Tone };
  const context    = getContext(log, assignees);
  const isBoss     = ['BOSS', 'ADMIN'].includes(log.performedBy.role.name);
  const showStatus  = !!log.newStatus && log.action !== 'COMPLETED';

  const bubble = isBoss
    ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 rounded-xl rounded-tl-sm'
    : 'bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl rounded-tr-sm';

  const roleLabel = isBoss
    ? 'text-indigo-400 dark:text-indigo-500'
    : 'text-slate-400 dark:text-slate-500';

  return (
    <div className={`flex gap-2 mb-3 ${isBoss ? 'justify-start' : 'justify-end'}`}>
      {isBoss && (
        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 mt-1">
          <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">
            {log.performedBy.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className={`max-w-[82%] px-3 py-2.5 ${bubble}`}>
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none">
            {log.performedBy.displayName}
          </span>
          <span className={`text-[9px] font-medium uppercase tracking-wide ${roleLabel}`}>
            {log.performedBy.role.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TONE_PILL[cfg.tone]}`}>
            {cfg.label}
          </span>
          {showStatus && <TaskStatusBadge status={log.newStatus as TaskStatus} size="sm" />}
        </div>
        {context && (
          <div className="mt-1.5 space-y-0.5">
            {context.split('\n').map((line, i) => (
              <p key={i} className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                ↳ {line}
              </p>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">{fmt(log.createdAt)}</p>
      </div>

      {!isBoss && (
        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-1">
          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300">
            {log.performedBy.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

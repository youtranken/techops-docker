'use client';

import { History } from 'lucide-react';
import { AuditLogEntry } from './AuditLogEntry';
import type { TaskDetail } from '../../services/task-query.service';

interface Props {
  auditLogs: TaskDetail['auditLogs'];
  assignees?: TaskDetail['assignees'];
  embedded?: boolean;
}

const HIDDEN_ACTIONS = new Set(['COMMENT_ADDED']);

export function DetailAuditLog({ auditLogs, assignees = [], embedded = false }: Props) {
  const filtered = auditLogs.filter((l) => !HIDDEN_ACTIONS.has(l.action));

  const list = (
    filtered.length === 0
      ? <p className="text-xs text-slate-400 italic text-center py-4">Chưa có hoạt động nào</p>
      : <div className="space-y-0">
          {filtered.map((log) => (
            <AuditLogEntry key={log.id} log={log} assignees={assignees} />
          ))}
        </div>
  );

  if (embedded) return list;

  if (filtered.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <History className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Lịch sử hoạt động</p>
        <span className="ml-auto text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
          {filtered.length}
        </span>
      </div>
      <div className="px-4 py-3">{list}</div>
    </div>
  );
}

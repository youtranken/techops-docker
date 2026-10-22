'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, ExternalLink, Image, Download, Maximize2 } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ASSIGNEE_STATUS_LABEL } from '../TaskQuickView/taskQuickView.constants';
import type { TaskDetail } from '../../services/task-query.service';
import { ReportDialog } from './ReportDialog';

type Assignee = TaskDetail['assignees'][number];
interface Props { assignee: Assignee; compact?: boolean }

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATUS_BADGE: Record<string, string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PENDING:     'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export function DetailAssigneeItem({ assignee: a, compact }: Props) {
  const hasReports = a.reports.length > 0;
  const [open, setOpen] = useState(false);
  const [viewReport, setViewReport] = useState<Assignee['reports'][number] | null>(null);

  /* ── Compact chip (dùng trong row ngang) ── */
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <UserAvatar displayName={a.user.displayName} avatarUrl={a.user.profile?.avatarUrl} avatarColor={a.user.profile?.avatarColor} size="sm" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{a.user.displayName}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[a.status] ?? 'bg-slate-200 text-slate-600'}`}>
          {ASSIGNEE_STATUS_LABEL[a.status] ?? a.status}
        </span>
      </div>
    );
  }

  /* ── Full card (dùng trong accordion / sidebar) ── */
  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
      <button
        onClick={() => hasReports && setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${hasReports ? 'hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer' : 'cursor-default'}`}
      >
        <UserAvatar displayName={a.user.displayName} avatarUrl={a.user.profile?.avatarUrl} avatarColor={a.user.profile?.avatarColor} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{a.user.displayName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{a.user.username}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${STATUS_BADGE[a.status] ?? 'bg-slate-200 text-slate-600'}`}>
          {ASSIGNEE_STATUS_LABEL[a.status] ?? a.status}
        </span>
        {hasReports && (open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />)}
      </button>

      {open && hasReports && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-100 dark:border-slate-700">
          {a.reports.map((r) => (
            <div key={r.id} className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">v{r.version}.{r.minorVersion ?? 0}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(r.submittedAt)}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewReport(r)}
                title="Xem đầy đủ báo cáo"
                className="group/report block w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <p className="px-3 pt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap line-clamp-3 group-hover/report:text-slate-900 dark:group-hover/report:text-slate-200">{r.content}</p>
                <span className="px-3 pb-2 pt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover/report:underline">
                  <Maximize2 className="w-3 h-3" />Xem đầy đủ báo cáo
                </span>
              </button>
              {r.attachments.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {r.attachments.map((f) => {
                    const fileUrl = `/api/files?path=${encodeURIComponent(f.filePath)}`;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.fileName);
                    return (
                      <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                        {isImage
                          ? <Image className="w-3 h-3 text-blue-400 shrink-0" />
                          : <FileText className="w-3 h-3 text-red-400 shrink-0" />}
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 text-[11px] text-slate-600 dark:text-slate-400 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 min-w-0">
                          {f.fileName}
                        </a>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{formatSize(f.fileSize)}</span>
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" title="Xem"
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-400 transition-all">
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <a href={`${fileUrl}&dl=1`} download title="Tải về"
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 transition-all">
                          <Download className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ReportDialog
        report={viewReport}
        authorName={a.user.displayName}
        onClose={() => setViewReport(null)}
        formatDate={formatDate}
        formatSize={formatSize}
      />
    </div>
  );
}

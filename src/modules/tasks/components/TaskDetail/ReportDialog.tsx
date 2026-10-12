'use client';

import { FileText, Image, ExternalLink, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { TaskDetail } from '../../services/task-query.service';

type Report = TaskDetail['assignees'][number]['reports'][number];

interface Props {
  report: Report | null;
  authorName: string;
  onClose: () => void;
  formatDate: (d: Date | string) => string;
  formatSize: (bytes: number) => string;
}

/** Mục 3 (V2) — xem đầy đủ báo cáo hoàn thành của người thực hiện; nội dung dài thì cuộn trong popup. */
export function ReportDialog({ report, authorName, onClose, formatDate, formatSize }: Props) {
  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[86vh] p-0 gap-0 flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-700">
        {report && (
          <>
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 pr-12">
              <DialogDescription className="text-xs text-slate-400">
                Báo cáo hoàn thành v{report.version} · {formatDate(report.submittedAt)}
              </DialogDescription>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">{authorName}</DialogTitle>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
              {report.content || <span className="italic text-slate-400">Không có nội dung</span>}
            </div>

            {report.attachments.length > 0 && (
              <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                {report.attachments.map((f) => {
                  const fileUrl = `/api/files?path=${encodeURIComponent(f.filePath)}`;
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.fileName);
                  return (
                    <div key={f.id} className="flex items-center gap-3 px-5 py-2 text-sm">
                      {isImage
                        ? <Image className="w-4 h-4 text-blue-400 shrink-0" />
                        : <FileText className="w-4 h-4 text-red-400 shrink-0" />}
                      <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-300" title={f.fileName}>{f.fileName}</span>
                      <span className="text-xs text-slate-400 shrink-0">{formatSize(f.fileSize)}</span>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
                        <ExternalLink className="w-3 h-3" />Xem
                      </a>
                      <a href={`${fileUrl}&dl=1`} download
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline shrink-0">
                        <Download className="w-3 h-3" />Tải về
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

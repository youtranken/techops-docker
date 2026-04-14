'use client';

import { Plus, Paperclip, Download, FileText, File, Image, ExternalLink } from 'lucide-react';
import type { TaskDetail } from '../../services/task-query.service';

interface Props { attachments: TaskDetail['attachments'] }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext))                        return <FileText className="w-5 h-5 text-red-500" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image className="w-5 h-5 text-blue-500" />;
  if (['sql', 'csv', 'xls', 'xlsx'].includes(ext)) return <FileText className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
}

export function DetailTaskAttachments({ attachments }: Props) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 delay-75 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 border-l-amber-400 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Paperclip className="w-3.5 h-3.5 text-amber-500" />
          File đính kèm
        </h3>
        <button
          className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
          title="Thêm file"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Chưa có tài liệu đính kèm</p>
      ) : (
        <div className="space-y-1">
          {attachments.map((f) => {
            const fileUrl = `/api/files?path=${encodeURIComponent(f.filePath)}`;
            return (
              <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors group border border-transparent hover:border-amber-100 dark:hover:border-amber-800/40">
                <FileIcon name={f.fileName} />
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {f.fileName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatSize(f.fileSize)}</p>
                </a>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" title="Xem trực tiếp"
                    className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-400 hover:text-indigo-600 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a href={`${fileUrl}&dl=1`} download title="Tải về"
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

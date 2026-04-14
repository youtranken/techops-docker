'use client';

import { FileText, ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AssigneeOption } from './RejectReviewModal';

interface Props {
  assignee: AssigneeOption;
  checked: boolean;
  hideCheckbox?: boolean;
  reason: string;
  showError: boolean;
  onToggle: () => void;
  onReasonChange: (v: string) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function AssigneeRejectCard({ assignee, checked, hideCheckbox, reason, showError, onToggle, onReasonChange }: Props) {
  const report = assignee.latestReport;

  return (
    <div className={`rounded-lg border transition-colors ${checked ? 'border-red-200 bg-red-50/30 dark:border-red-800/40 dark:bg-red-950/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/30'}`}>
      {!hideCheckbox && (
        <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
          <Checkbox
            checked={checked}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
          />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{assignee.displayName}</span>
        </label>
      )}

      {checked && (
        <div className={`px-3 pb-3 space-y-2 ${!hideCheckbox ? 'border-t border-slate-100 dark:border-slate-700' : 'pt-3'}`}>
          {report && (
            <div className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs overflow-hidden">
              <p className="px-3 py-2 text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">{report.content}</p>
              {report.attachments.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {report.attachments.map((f, i) => (
                    <a key={i} href={`/api/files?path=${encodeURIComponent(f.filePath)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 group transition-colors"
                    >
                      <FileText className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="flex-1 truncate text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{f.fileName}</span>
                      <span className="text-slate-400 dark:text-slate-500 shrink-0">{formatSize(f.fileSize)}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Lý do <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder={`Lý do yêu cầu ${assignee.displayName} làm lại...`}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={2}
              className={showError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {showError && <p className="text-xs text-red-500">Vui lòng nhập lý do</p>}
          </div>
        </div>
      )}
    </div>
  );
}

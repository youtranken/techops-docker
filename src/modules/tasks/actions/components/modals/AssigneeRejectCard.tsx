'use client';

/** Một dòng người làm trong hộp Yêu cầu làm lại (preview `.rw-row` + `.rw-why`): chọn → hiện báo cáo mới nhất + ô lý do. */
import { useTranslations, useLocale } from 'next-intl';
import { FileText, ExternalLink } from 'lucide-react';
import { Field, textareaClass } from '@/shared/ui/Field';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { fileSizeLabel } from './action-dialog-rules';
import type { AssigneeOption } from './RejectReviewModal';

interface Props {
  assignee: AssigneeOption;
  checked: boolean;
  hideCheckbox?: boolean;
  reason: string;
  error?: string;
  onToggle: () => void;
  onReasonChange: (v: string) => void;
}

export function AssigneeRejectCard({ assignee, checked, hideCheckbox, reason, error, onToggle, onReasonChange }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const report = assignee.latestReport;
  const fid = `dlg-rw-${assignee.assigneeId}`;

  return (
    <div className="border-t border-line py-1.5 last:border-b" data-rw={assignee.assigneeId}>
      {!hideCheckbox && (
        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-ink max-[680px]:min-h-11">
          <input
            type="checkbox"
            name="dlg-rw"
            checked={checked}
            onChange={onToggle}
            className="size-4 flex-none accent-[var(--primary)]"
          />
          <UserAvatar displayName={assignee.displayName} size="xs" />
          <span className="min-w-0 flex-1 truncate">{assignee.displayName}</span>
        </label>
      )}
      {checked && (
        <div className="pb-2 pl-[26px] pt-0.5 max-[680px]:pl-0">
          {report && (
            <div className="mb-2.5 overflow-hidden rounded-ctl border border-line text-xs">
              <p className="m-0 px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">{t('tdx.dlg.rework.latest')}</p>
              <p className="m-0 line-clamp-3 whitespace-pre-wrap px-3 pb-2 pt-1 leading-relaxed text-ink-2">{report.content}</p>
              {report.attachments.length > 0 && (
                <ul className="m-0 list-none divide-y divide-line border-t border-line p-0">
                  {report.attachments.map((f, i) => (
                    <li key={i}>
                      <a
                        href={`/api/files?path=${encodeURIComponent(f.filePath)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-primary-text"
                      >
                        <FileText aria-hidden className="size-3.5 flex-none text-ink-3" />
                        <span className="min-w-0 flex-1 truncate">{f.fileName}</span>
                        <span className="flex-none font-mono text-ink-3">{fileSizeLabel(f.fileSize, locale)}</span>
                        <ExternalLink aria-hidden className="size-3 flex-none text-ink-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Field id={fid} label={t('app.dlg.rework.reason', { a: assignee.displayName })} required error={error}>
            <textarea
              rows={2}
              className={`${textareaClass} min-h-[68px]`}
              placeholder={t('app.dlg.rework.ph')}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

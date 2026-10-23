'use client';

/** Popup báo cáo của 1 người làm (preview `App.reportPopup`): chọn phiên bản, nội dung dài thì cuộn, kèm tệp xem/tải. */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Segmented } from '@/components/ui/segmented';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useFormat } from '@/i18n/useFormat';
import type { TaskDetail } from '../../services/task-query.service';
import { FileRow } from './DetailFiles';

type Assignee = TaskDetail['assignees'][number];
export const ver = (r: { version: number; minorVersion: number | null }) => `v${r.version}.${r.minorVersion ?? 0}`;

export function fmtDateTime(d: Date | string, locale: string) {
  return new Date(d).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  assignee: Assignee | null;
  taskCode: string;
  taskTitle: string;
  onClose: () => void;
}

export function ReportDialog({ assignee, taskCode, taskTitle, onClose }: Props) {
  const t = useTranslations();
  const f = useFormat();
  const reports = assignee?.reports ?? [];
  const [idx, setIdx] = React.useState(Math.max(reports.length - 1, 0));
  React.useEffect(() => { setIdx(Math.max((assignee?.reports.length ?? 1) - 1, 0)); }, [assignee]);
  const r = reports[idx];

  return (
    <Dialog open={!!assignee && !!r} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[86vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        {assignee && r && (
          <>
            <div className="border-b border-line px-5 py-4 pr-12">
              <DialogTitle className="font-head text-[17px] font-semibold text-ink">{t('td.reportOf', { a: assignee.user.displayName })}</DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-[13px] text-ink-3">
                <span className="font-mono">{taskCode}</span> · {taskTitle}
              </DialogDescription>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {reports.length > 1 && (
                <Segmented
                  ariaLabel={t('td.version')}
                  size="sm"
                  value={String(idx)}
                  onChange={(v) => setIdx(Number(v))}
                  options={reports.map((x, i) => ({ value: String(i), label: <span className="font-mono">{ver(x)}</span> }))}
                />
              )}
              <div className="mt-3 flex items-center gap-2 text-[13px]">
                <UserAvatar displayName={assignee.user.displayName} avatarUrl={assignee.user.profile?.avatarUrl} avatarColor={assignee.user.profile?.avatarColor} size="xs" />
                <b className="font-semibold text-ink">{assignee.user.displayName}</b>
                <span className="text-xs text-ink-3">{fmtDateTime(r.submittedAt, f.locale)} · <span className="font-mono">{ver(r)}</span></span>
              </div>
              <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                {r.content || <span className="italic text-ink-3">{t('td.noReport')}</span>}
              </div>
              {r.attachments.length > 0 && (
                <div className="mt-3.5 grid gap-2" aria-label={t('td.files')}>
                  {r.attachments.map((x) => <FileRow key={x.id} file={x} />)}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

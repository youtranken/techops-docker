'use client';

/** Tab Gia hạn (preview `.ext`). Hành vi = ExtensionList V1: "Xem xét" (người có quyền duyệt) mở ApproveExtensionModal V1; người xin rút đơn. */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CalendarPlus, Info, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/i18n/useFormat';
import { ApproveExtensionModal } from '../../actions/components/modals/ApproveExtensionModal';
import { useApproveExtension, useRejectExtension, useWithdrawExtension } from '../../actions/hooks/useExtensions';
import type { TaskDetail } from '../../services/task-query.service';
import type { TaskDetailModel } from './useTaskDetailModel';

type Ext = TaskDetail['extensions'][number];
const EXT_COLOR: Record<string, string> = { PENDING: 'var(--c-review)', APPROVED: 'var(--c-done)', REJECTED: 'var(--danger)' };

export function ExtensionsPanel({ model }: { model: TaskDetailModel }) {
  const t = useTranslations();
  const f = useFormat();
  const { task, permissions } = model;
  const [review, setReview] = React.useState<Ext | null>(null);
  const approve = useApproveExtension();
  const reject = useRejectExtension();
  const withdraw = useWithdrawExtension();
  const canReq = model.actions.more.includes('extension');

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 inline-flex items-center gap-1.5 text-xs text-ink-3"><Info aria-hidden className="size-3.5" />{t('td.ext.rules')}</p>
        {canReq && (
          <Button type="button" variant="outline" size="xs" onClick={() => model.panel.setModal('extension')}>
            <CalendarPlus aria-hidden />{t('act.extend')}
          </Button>
        )}
      </div>
      {task.extensions.length === 0 ? (
        <p className="m-0 py-2 text-[13px] text-ink-3">{t('td.ext.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0" data-testid="ext-list">
          {task.extensions.map((e) => {
            const own = e.requester?.id === model.viewerId;
            return (
              <li key={e.id} className="border-b border-line py-3.5 last:border-b-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
                  <b className="font-semibold text-ink">{e.requester?.displayName}</b>
                  <span className="ml-auto inline-flex items-center gap-2 text-xs text-ink-2">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: EXT_COLOR[e.status] ?? 'var(--ink-3)' }} />
                    {t(`td.ext.st.${e.status}`)}
                  </span>
                </div>
                <p className="m-0 mt-1 text-[13px] font-medium text-ink">{t('tdx.ext.date', { d: f.date(e.requestedDate) })}</p>
                <p className="m-0 mt-0.5 text-sm text-ink-2 [overflow-wrap:anywhere]">{e.reason}</p>
                {e.responseNote && (
                  <p className="m-0 mt-2 rounded-ctl bg-surface-2 px-2.5 py-2 text-[13px] text-ink-2">{e.responseNote}</p>
                )}
                {e.status === 'PENDING' && (permissions.canApproveExtension || (own && permissions.canWithdrawExtension)) && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {permissions.canApproveExtension && (
                      <Button type="button" variant="outline" size="xs" onClick={() => setReview(e)}>{t('tdx.ext.review')}</Button>
                    )}
                    {own && permissions.canWithdrawExtension && (
                      <Button type="button" variant="subtle" size="xs" disabled={withdraw.isPending}
                        onClick={() => withdraw.mutate({ taskId: task.id, extId: e.id })}>
                        <Undo2 aria-hidden />{t('td.ext.withdraw')}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ApproveExtensionModal
        open={!!review}
        onClose={() => setReview(null)}
        extension={review ? { id: review.id, reason: review.reason, requestedDate: review.requestedDate, requesterName: review.requester?.displayName ?? '' } : null}
        isLoading={approve.isPending || reject.isPending}
        onApprove={(extId, note) => approve.mutate({ taskId: task.id, extId, responseNote: note })}
        onReject={(extId, note) => reject.mutate({ taskId: task.id, extId, responseNote: note })}
      />
    </>
  );
}


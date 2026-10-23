'use client';

/**
 * Yêu cầu làm lại (V2). V1: mặc định chọn mọi người đã báo cáo, lý do riêng từng người (không rỗng);
 * gửi `onConfirm([{assigneeId, reason.trim()}])` (approval.service rejectReview: người được chọn → Cần làm lại, việc → Đang làm).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { AlertCircle } from 'lucide-react';
import { AssigneeRejectCard } from './AssigneeRejectCard';
import { reworkErrors } from './action-dialog-rules';

export interface AssigneeOption {
  assigneeId: string;
  displayName: string;
  latestReport?: {
    content: string;
    attachments: { fileName: string; filePath: string; fileSize: number }[];
  };
}

export interface RejectReviewEntry {
  assigneeId: string | undefined;
  reason: string;
}

interface RejectReviewModalProps {
  open: boolean;
  onClose: () => void;
  completedAssignees: AssigneeOption[];
  isLoading?: boolean;
  onConfirm: (entries: RejectReviewEntry[]) => void;
  task?: { code?: string | null; title: string } | null;
}

export function RejectReviewModal({ open, onClose, completedAssignees, isLoading = false, onConfirm, task }: RejectReviewModalProps) {
  const t = useTranslations();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [tried, setTried] = React.useState(false);

  // V1: mở lại → chọn sẵn tất cả. Chỉ reset khi mở (danh sách tạo mới mỗi render ở nơi gọi).
  const ids = completedAssignees.map((a) => a.assigneeId).join('|');
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(ids ? ids.split('|') : []));
      setReasons({});
      setTried(false);
    }
  }, [open, ids]);

  const selected = completedAssignees.filter((a) => selectedIds.has(a.assigneeId));
  const allChecked = completedAssignees.length > 0 && selected.length === completedAssignees.length;
  const someChecked = selected.length > 0;
  const errs = tried ? reworkErrors(selected.map((a) => a.assigneeId), reasons) : null;

  const allRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (allRef.current) allRef.current.indeterminate = someChecked && !allChecked; });

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function submit() {
    setTried(true);
    const e = reworkErrors(selected.map((a) => a.assigneeId), reasons);
    if (!e.ok) {
      const firstBad = Object.keys(e.reasons)[0];
      (firstBad ? document.getElementById(`dlg-rw-${firstBad}`) : document.querySelector<HTMLInputElement>('input[name="dlg-rw"]'))?.focus();
      return;
    }
    onConfirm(selected.map((a) => ({ assigneeId: a.assigneeId, reason: (reasons[a.assigneeId] ?? '').trim() })));
  }

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={t('app.dlg.rework.t')}
      task={task}
      okLabel={t('act.rework')}
      onOk={submit}
      pending={isLoading}
      data-testid="dlg-rework"
    >
      <p>{t('app.dlg.rework.d')}</p>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-medium text-ink">
          {t('app.dlg.rework.pick')} <span className="text-danger" aria-hidden>*</span>
        </legend>
        {completedAssignees.length > 1 && (
          <label className="flex min-h-9 cursor-pointer items-center gap-2.5 pb-1 text-[13px] font-medium text-ink max-[680px]:min-h-11">
            <input
              ref={allRef}
              type="checkbox"
              checked={allChecked}
              onChange={() => setSelectedIds(allChecked ? new Set() : new Set(completedAssignees.map((a) => a.assigneeId)))}
              className="size-4 flex-none accent-[var(--primary)]"
            />
            {t('tdx.dlg.rework.all', { n: completedAssignees.length })}
          </label>
        )}
        {completedAssignees.map((a) => (
          <AssigneeRejectCard
            key={a.assigneeId}
            assignee={a}
            checked={selectedIds.has(a.assigneeId)}
            reason={reasons[a.assigneeId] ?? ''}
            error={errs?.reasons[a.assigneeId] ? t(errs.reasons[a.assigneeId].key) : undefined}
            onToggle={() => toggle(a.assigneeId)}
            onReasonChange={(v) => setReasons((p) => ({ ...p, [a.assigneeId]: v }))}
          />
        ))}
        {errs?.pick && (
          <p className="m-0 mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger" role="alert">
            <AlertCircle aria-hidden className="size-3.5" />{t(errs.pick.key)}
          </p>
        )}
      </fieldset>
    </ActionDialog>
  );
}

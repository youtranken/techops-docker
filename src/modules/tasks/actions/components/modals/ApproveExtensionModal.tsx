'use client';

/**
 * Xem xét đơn gia hạn (V2) — vẫn MỘT hộp như V1 với hai lựa chọn [Từ chối][Duyệt gia hạn], phản hồi không bắt buộc.
 * Như V1: bấm Duyệt/Từ chối gọi `onApprove/onReject(extId, note)` rồi đóng ngay.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, textareaClass } from '@/shared/ui/Field';
import { useFormat } from '@/i18n/useFormat';

interface ExtensionInfo {
  id: string;
  reason: string;
  requestedDate: Date | string;
  requesterName: string;
}

interface ApproveExtensionModalProps {
  open: boolean;
  onClose: () => void;
  extension: ExtensionInfo | null;
  onApprove: (extId: string, note?: string) => void;
  onReject: (extId: string, note?: string) => void;
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
}

export function ApproveExtensionModal({
  open, onClose, extension, onApprove, onReject, isLoading = false, task,
}: ApproveExtensionModalProps) {
  const t = useTranslations();
  const f = useFormat();
  const [note, setNote] = React.useState('');

  React.useEffect(() => { if (open) setNote(''); }, [open]);

  if (!extension) return null;

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={t('tdx.dlg.extRev.t')}
      size="md"
      task={task}
      okLabel={t('tdx.dlg.extRev.ok')}
      onOk={() => { onApprove(extension.id, note); onClose(); }}
      pending={isLoading}
      extraActions={(
        <Button type="button" variant="neg" size="md" disabled={isLoading} onClick={() => { onReject(extension.id, note); onClose(); }}>
          {t('act.decline')}
        </Button>
      )}
      data-testid="dlg-ext-review"
    >
      <div className="mb-4 rounded-ctl border border-line p-3">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <b className="font-semibold text-ink">{extension.requesterName}</b>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-2">
            <span aria-hidden className="size-2 rounded-full" style={{ background: 'var(--c-review)' }} />
            {t('td.ext.st.PENDING')}
          </span>
        </div>
        <p className="m-0 mt-1 text-[13px] font-medium text-ink">{t('tdx.ext.date', { d: f.date(extension.requestedDate) })}</p>
        <p className="m-0 mt-0.5 text-sm text-ink-2 [overflow-wrap:anywhere]">{extension.reason}</p>
      </div>
      <Field id="dlg-ext-note" label={t('app.dlg.reply._')}>
        <textarea rows={2} className={`${textareaClass} min-h-[68px]`} placeholder={t('app.dlg.reply.ph')} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <DialogNote>{t('tdx.dlg.extRev.note')}</DialogNote>
    </ActionDialog>
  );
}

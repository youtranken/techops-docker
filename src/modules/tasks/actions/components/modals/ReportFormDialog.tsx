'use client';

/**
 * Thân chung của hộp Báo cáo xong / Bổ sung báo cáo (preview `App.act` 'report' | 'supplement').
 * Luật V1: nội dung ≥10 ký tự (`reportError`), tệp theo attachment-rules, dán ảnh. Gửi `onConfirm(nội dung, tệp)` như V1.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, textareaClass } from '@/shared/ui/Field';
import { cn } from '@/lib/utils';
import { AttachmentField, type FileEntry } from './AttachmentField';
import { reportError, REPORT_MIN, type Msg } from './action-dialog-rules';

export interface ReportFormDialogProps {
  kind: 'complete' | 'supplement';
  open: boolean;
  onClose: () => void;
  onConfirm: (content: string, files: FileEntry[]) => void;
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
  /** Phiên bản sẽ tạo, vd "v2.0" */
  version?: string | null;
  /** Ghi chú điều gì xảy ra sau khi gửi (chỉ khi xác định đúng theo service V1) */
  next?: Msg | null;
  description?: React.ReactNode;
  /** Ô chọn mẫu (chỉ Báo cáo xong) — nhận setter nội dung */
  templateSlot?: (setContent: (v: string) => void) => React.ReactNode;
}

export function ReportFormDialog({
  kind, open, onClose, onConfirm, isLoading = false, task, version, next, description, templateSlot,
}: ReportFormDialogProps) {
  const t = useTranslations();
  const rep = kind === 'complete';
  const [content, setContent] = React.useState('');
  const [files, setFiles] = React.useState<FileEntry[]>([]);
  const [tried, setTried] = React.useState(false);

  React.useEffect(() => { if (open) { setContent(''); setFiles([]); setTried(false); } }, [open]);

  const err = tried ? reportError(content) : null;
  const n = content.length;

  function submit() {
    setTried(true);
    if (reportError(content)) { document.getElementById('dlg-report')?.focus(); return; }
    onConfirm(content, files);
  }

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={t(rep ? 'app.dlg.report.t' : 'app.dlg.supp.t')}
      sub={version ? t('app.dlg.report.ver', { v: version }) : undefined}
      task={task}
      okLabel={t(rep ? 'app.dlg.report.send' : 'app.dlg.supp.send')}
      onOk={submit}
      pending={isLoading}
      data-testid={rep ? 'dlg-complete' : 'dlg-supplement'}
    >
      {description && <p>{description}</p>}
      {templateSlot?.((v) => setContent(v))}
      <Field
        id="dlg-report"
        label={t(rep ? 'app.dlg.report.label' : 'app.dlg.supp.label')}
        required
        error={err ? t(err.key, err.values) : undefined}
        aside={n < REPORT_MIN ? (
          <span className={cn('font-mono text-xs text-ink-3', n > 0 && 'text-danger')} aria-hidden>{n}/{REPORT_MIN}</span>
        ) : null}
      >
        <textarea
          rows={5}
          className={textareaClass}
          placeholder={t(rep ? 'app.dlg.report.ph' : 'app.dlg.supp.ph')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </Field>
      <AttachmentField files={files} onChange={setFiles} active={open} />
      {next && <DialogNote tone={next.key === 'app.dlg.next.wait' ? 'warn' : 'info'}>{t(next.key, next.values)}</DialogNote>}
    </ActionDialog>
  );
}

'use client';

/** Bổ sung báo cáo (V2): tạo phiên bản minor mới (reports route V1). Payload `onConfirm(nội dung, tệp)` như V1. */
import { useTranslations } from 'next-intl';
import { ReportFormDialog } from './ReportFormDialog';
import type { FileEntry } from './AttachmentField';

interface Props {
  taskId?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (content: string, files: FileEntry[]) => void;
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
  version?: string | null;
}

export function SupplementReportModal({ taskId, open, onClose, onConfirm, isLoading = false, task, version }: Props) {
  const t = useTranslations();
  if (!taskId) return null;
  return (
    <ReportFormDialog
      kind="supplement"
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      task={task}
      version={version}
      description={t('tdx.dlg.supp.d')}
    />
  );
}

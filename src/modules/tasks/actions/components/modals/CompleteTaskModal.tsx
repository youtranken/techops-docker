'use client';

/** Báo cáo hoàn thành (V2): chọn Mẫu hoàn thành (API V1 `completion-templates`) + nội dung + tệp/dán ảnh. Payload như V1. */
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DialogNote } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { cn } from '@/lib/utils';
import { ReportFormDialog } from './ReportFormDialog';
import type { FileEntry } from './AttachmentField';
import type { Msg } from './action-dialog-rules';

interface TemplateItem { id: string; title: string; content: string; category: string | null }

interface CompleteTaskModalProps {
  taskId?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (reportContent: string, files: FileEntry[]) => void;
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
  version?: string | null;
  next?: Msg | null;
}

export function CompleteTaskModal({ taskId, open, onClose, onConfirm, isLoading = false, task, version, next }: CompleteTaskModalProps) {
  const t = useTranslations();
  const [picked, setPicked] = React.useState('');
  React.useEffect(() => { if (open) setPicked(''); }, [open]);

  const { data: templates = [], isFetched } = useQuery<TemplateItem[]>({
    queryKey: ['report-templates-task', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await fetch(`/api/tasks/${taskId}/completion-templates`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: open && !!taskId,
    staleTime: 5 * 60_000,
  });

  return (
    <ReportFormDialog
      kind="complete"
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      isLoading={isLoading}
      task={task}
      version={version}
      next={next}
      templateSlot={(setContent) => (
        !isFetched ? null : templates.length > 0 ? (
          <Field id="dlg-tpl" label={t('app.dlg.tpl._')} hint={t('tdx.dlg.tpl.hint')}>
            <select
              className={cn(inputClass, 'pr-8')}
              value={picked}
              onChange={(e) => {
                setPicked(e.target.value);
                const x = templates.find((p) => p.id === e.target.value);
                if (x) setContent(x.content);
              }}
            >
              <option value="">{t('app.dlg.tpl.ph')}</option>
              {templates.map((p) => (
                <option key={p.id} value={p.id}>{p.category ? `[${p.category}] ` : ''}{p.title}</option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="mb-4">
            <DialogNote className="first:mt-0 mt-0">{t('app.dlg.tpl.none')}</DialogNote>
          </div>
        )
      )}
    />
  );
}

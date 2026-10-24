'use client';

/**
 * Mẫu email (preview `pEmails` + `editEmail`; V1 là danh sách xổ ra trong tab SMTP). API V1: GET/PUT /api/settings/email-templates.
 * Giữ V1: PUT { key, subject, body, isActive } của đúng mẫu; mẫu chưa lưu là "Mặc định" (isDefault từ server).
 * Phase B: "Khôi phục mẫu mặc định" (V1 không có API xoá mẫu đã lưu).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Lock } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import type { EmailTemplate } from '../../types';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import { Dot, HeadTag, PanelHead } from '../shell/parts';
import { EmailTemplateDialog } from './EmailTemplateDialog';

type Row = EmailTemplate & { isDefault?: boolean };

export function EmailTemplatesPanel() {
  const t = useTranslations();
  const { data = [], isLoading, isError, refetch } = useEmailTemplates();
  const [editing, setEditing] = React.useState<Row | null>(null);
  const label = (k: string) => (t.has(`set.nt.${k}._`) ? t(`set.nt.${k}._`) : k);

  const columns: DataTableColumn<Row>[] = [
    { key: 'n', header: t('set.col.notif'), mobile: 'main', cell: (r) => <b className="block truncate font-medium text-ink">{label(r.key)}</b> },
    { key: 's', header: t('set.col.subject'), width: 'minmax(0,1.6fr)', mobileOrder: 2, className: 'max-[680px]:basis-full', cell: (r) => <span className="block truncate font-mono text-xs text-ink-2">{r.subject}</span> },
    { key: 'st', header: t('set.col.status'), width: '104px', cell: (r) => (r.isDefault ? <span className="text-[13px] text-ink-3">{t('set.em.default')}</span> : <Dot tone="progress">{t('set.em.custom')}</Dot>) },
    { key: 'c', header: <span className="sr-only">{t('set.col.act')}</span>, width: '20px', hideBelow: 'md', cell: () => <ChevronRight aria-hidden className="size-4 text-ink-3" /> },
  ];

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead title={t('set.s.emails')} description={t('set.d.emails')} tags={<HeadTag icon={Lock}>{t('set.adminOnly')}</HeadTag>} />
      <DataTable
        ariaLabel={t('set.s.emails')}
        columns={columns}
        rows={data}
        getRowId={(r) => r.key}
        loading={isLoading}
        skeletonRows={8}
        error={isError ? t('set.err.listT') : undefined}
        onRetry={() => refetch()}
        onRowClick={(r) => setEditing(r)}
        data-testid="em-table"
      />
      {!isLoading && !isError && <p className="m-0 mx-0.5 mt-3 text-xs text-ink-3">{t('set.em.note')}</p>}
      <EmailTemplateDialog template={editing} title={editing ? label(editing.key) : ''} onClose={() => setEditing(null)} />
    </section>
  );
}

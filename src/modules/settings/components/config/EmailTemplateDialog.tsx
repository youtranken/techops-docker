'use client';

/**
 * Soạn mẫu email (preview `editEmail`): tiêu đề, chip biến chèn vào vị trí con trỏ, nội dung HTML với Soạn / Xem trước.
 * Xem trước trong iframe sandbox (không chạy script) thay cho chèn HTML thẳng vào trang như V1.
 * Lưu: PUT { key, subject, body, isActive } như V1 (subject 1–200 ký tự, body bắt buộc — zod route).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Field, inputClass, textareaClass } from '@/shared/ui/Field';
import { Segmented } from '@/components/ui/segmented';
import { cn } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import type { EmailTemplate } from '../../types';
import { useUpsertEmailTemplate } from '../../hooks/useEmailTemplates';

const VARS = ['taskTitle', 'userName', 'deadline', 'createdAt', 'taskUrl'];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function EmailTemplateDialog({ template, title, onClose }: { template: (EmailTemplate & { isDefault?: boolean }) | null; title: string; onClose: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const upsert = useUpsertEmailTemplate();
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [view, setView] = React.useState<'edit' | 'prev'>('edit');
  const [errs, setErrs] = React.useState<{ subject?: string; body?: string }>({});
  const last = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (template) { setSubject(template.subject); setBody(template.body); setView('edit'); setErrs({}); last.current = null; }
  }, [template]);

  function insert(v: string) {
    const el = last.current ?? (document.getElementById('em-body') as HTMLTextAreaElement | null);
    if (!el) return;
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? s;
    const next = el.value.slice(0, s) + v + el.value.slice(e);
    if (el.id === 'em-subject') setSubject(next); else setBody(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length); });
  }

  async function save() {
    if (!template) return;
    const e: { subject?: string; body?: string } = {};
    if (!subject) e.subject = t('set.v.req');
    else if (subject.length > 200) e.subject = t('setx.v.max', { n: 200 });
    if (!body) e.body = t('set.v.req');
    setErrs(e);
    if (e.subject) { document.getElementById('em-subject')?.focus(); return; }
    if (e.body) { setView('edit'); requestAnimationFrame(() => document.getElementById('em-body')?.focus()); return; }
    try {
      await upsert.mutateAsync({ key: template.key, subject, body, isActive: template.isActive });
      toast.success(t('set.updated', { x: title }));
      onClose();
    } catch (err) {
      toast.error(errMsg(err, 'Lỗi khi lưu'));
    }
  }

  const srcDoc = `<!doctype html><meta charset="utf-8"><body style="font:14px/1.6 system-ui,sans-serif;color:#0F1729;margin:16px"><p style="font-size:12px;color:#8892A6;margin:0 0 12px">${esc(t('set.em.subject'))}: ${esc(subject)}</p>${body}</body>`;

  return (
    <ActionDialog open={!!template} onClose={onClose} size="lg" title={title} sub={t('set.em.dlgSub')} okLabel={t('set.em.save')} onOk={save} pending={upsert.isPending} data-testid="em-dialog">
      <Field id="em-subject" label={t('set.em.subject')} required error={errs.subject}>
        <input className={cn(inputClass, 'font-mono text-[13px]')} value={subject} onFocus={(e) => { last.current = e.currentTarget; }} onChange={(e) => { setSubject(e.target.value); setErrs((x) => ({ ...x, subject: undefined })); }} />
      </Field>
      <div className="-mt-2 mb-1.5 flex flex-wrap gap-1.5" aria-label={t('set.em.vars')} role="group">
        {VARS.map((v) => (
          <button key={v} type="button" title={t('set.em.insert')} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(`{{${v}}}`)} className="inline-flex h-[22px] items-center rounded-full border border-line-2 bg-surface px-2 font-mono text-[11px] text-ink-2 hover:border-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {`{{${v}}}`}
          </button>
        ))}
      </div>
      <p className="m-0 mb-4 text-xs text-ink-3">{t('set.em.varsH')}</p>
      <div className="mb-1.5 flex items-center gap-3">
        <label htmlFor="em-body" className="text-[13px] font-medium text-ink">{t('set.em.body')} <span aria-hidden className="text-danger">*</span></label>
        <Segmented<'edit' | 'prev'> className="ml-auto" size="sm" ariaLabel={t('set.em.view')} value={view} onChange={setView} options={[{ value: 'edit', label: t('set.em.edit') }, { value: 'prev', label: t('set.em.prev') }]} />
      </div>
      <textarea
        id="em-body"
        hidden={view !== 'edit'}
        spellCheck={false}
        aria-invalid={errs.body ? true : undefined}
        aria-describedby={errs.body ? 'em-body-err' : undefined}
        className={cn(textareaClass, 'min-h-[220px] font-mono text-[13px] leading-[1.55]')}
        value={body}
        onFocus={(e) => { last.current = e.currentTarget; }}
        onChange={(e) => { setBody(e.target.value); setErrs((x) => ({ ...x, body: undefined })); }}
      />
      {view === 'prev' && (
        <iframe title={t('set.em.prev')} sandbox="" srcDoc={srcDoc} className="h-[260px] w-full rounded-ctl border border-line bg-white dark:border-line-2 dark:opacity-95" />
      )}
      {errs.body && <p id="em-body-err" className="m-0 mt-1.5 text-xs font-medium text-danger">{errs.body}</p>}
      {template?.isDefault && <p className="m-0 mt-2 text-xs text-ink-3">{t('set.em.isDefault')}</p>}
    </ActionDialog>
  );
}

'use client';

/**
 * Trang đầy đủ "Tạo công việc" V2 — preview `task-form.html` (2 thẻ Nội dung | Thiết lập + thanh hành động dính đáy).
 * /tasks/new · ?draft=<id> mở nháp (localStorage) · ?from=panel nhận dữ liệu đang nhập từ ngăn trượt.
 * Rời trang khi có thay đổi → hỏi (link trong app + beforeunload).
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Trash2, Info, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/shared/ui/States';
import { PhaseBBadge } from '@/shared/ui/PhaseBBadge';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useAssignableUsers } from '../../hooks/useAssignableUsers';
import { FIELD_ORDER } from './form-logic';
import { useTaskForm } from './useTaskForm';
import { TitleField, DescField, SetupFields, FilesField, TopNote, SummaryLine, focusField } from './TaskFormFields';
import { peekHandoff, clearHandoff } from './handoff';

export function TaskFormPage() {
  const { status } = useSession();
  const sp = useSearchParams();
  const draftId = sp.get('draft');
  const fromPanel = sp.get('from') === 'panel';
  if (status === 'loading') return <PageSkeleton />;
  return <PageBody key={`${draftId}-${fromPanel}`} draftId={draftId} fromPanel={fromPanel} />;
}

function PageSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-2 h-6 w-52" /><Skeleton className="mb-5 h-4 w-72" />
      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-6 max-[1023px]:grid-cols-1">
        <Skeleton className="h-[420px]" /><Skeleton className="h-[420px]" />
      </div>
    </div>
  );
}

const card = 'rounded-card border border-line bg-surface p-5 max-[680px]:p-4';

function PageBody({ draftId, fromPanel }: { draftId: string | null; fromPanel: boolean }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const router = useRouter();
  const confirm = useConfirm();
  const [handoff] = React.useState(() => (fromPanel ? peekHandoff() : null));
  React.useEffect(() => { clearHandoff(); }, []);
  const f = useTaskForm({ mode: 'create', draftId, handoff });
  const { data: people } = useAssignableUsers();
  const leaving = React.useRef(false);
  const dirtyRef = React.useRef(false);
  dirtyRef.current = f.dirty && !leaving.current;
  const draftable = !!handoff || !!f.draftId;
  const back = f.draftId || draftId ? '/tasks?view=drafts' : '/tasks';

  // Rời trang khi có thay đổi chưa lưu: link trong app (bắt ở pha capture, trước Next Link) + đóng tab / tải lại
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href') ?? '';
      if (!href || href.startsWith('#')) return;
      e.preventDefault();
      e.stopPropagation();
      void (async () => {
        const ok = await confirm({ title: t('tf.leave.t'), description: t('tf.leave.d'), confirmText: t('tf.leave.ok'), danger: true });
        if (ok) { leaving.current = true; dirtyRef.current = false; router.push(href); }
      })();
    }
    function onUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    }
    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onUnload);
    return () => { document.removeEventListener('click', onClick, true); window.removeEventListener('beforeunload', onUnload); };
  }, [confirm, router, t]);

  function go(href: string) { leaving.current = true; dirtyRef.current = false; router.push(href); }

  async function onSubmit() {
    const r = await f.submit();
    if (!r.ok) {
      if (r.reason === 'invalid') focusField(FIELD_ORDER.find((k) => r.errors[k]));
      else { toast.error(t('tf.toast.err')); requestAnimationFrame(() => document.getElementById('tf-srv')?.focus()); }
      return;
    }
    if (r.created) {
      toast.success(t('tf.toast.created', { id: r.created.taskCode ?? '', s: t(`st.${r.created.status}`) }));
      go(`/tasks/${r.created.id}`);
    }
  }

  function onSaveDraft() {
    const d = f.saveAsDraft();
    if (!d) { toast.error(t('tfx.draft.saveErr')); return; }
    toast.success(t('dr.toast.saved'));
    go('/tasks?view=drafts');
  }

  async function onDeleteDraft() {
    const ok = await confirm({ title: t('dr.del.t'), description: t('dr.del.d'), confirmText: t('tf.draft.del'), danger: true });
    if (!ok) return;
    f.deleteDraft();
    toast.success(t('dr.toast.deleted'));
    go('/tasks?view=drafts');
  }

  if (f.draftMissing) {
    return <EmptyState icon={FileQuestion} title={t('tfx.draft.nf.t')} description={t('tfx.draft.nf.d')} action={<Button asChild variant="outline" size="md"><Link href="/tasks?view=drafts">{t('dr.tab')}</Link></Button>} />;
  }

  return (
    <div data-testid="task-form-page">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 font-head text-[22px] font-semibold leading-tight text-ink">{t('tf.title.new')}</h1>
          {f.draftId ? (
            <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink-2">
              <span>{t('tf.draft.title')}</span><PhaseBBadge className="ml-0" /><span aria-hidden className="text-ink-3">·</span><span className="text-ink-3">{t('dr.local')}</span>
            </p>
          ) : (
            <p className="m-0 mt-1 text-[13px] text-ink-3">{t('tf.sub.new')}</p>
          )}
        </div>
        {f.draftId && (
          <Button type="button" variant="neg" size="md" onClick={onDeleteDraft} disabled={f.pending} className="max-[680px]:h-11">
            <Trash2 aria-hidden />{t('tf.draft.del')}
          </Button>
        )}
      </div>

      <TopNote f={f} errMsg={errMsg} />
      {f.draftId && (
        <p className="m-0 mb-4 flex items-start gap-2 rounded-ctl bg-c-draft/15 px-3 py-2.5 text-[13px] leading-snug text-ink-2" data-testid="tf-draft-note">
          <Info aria-hidden className="mt-0.5 size-4 flex-none text-ink-3" />
          <span>{t('tf.draft.note')} {t('tfx.draft.noFiles')}</span>
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1279px]:grid-cols-[minmax(0,1fr)_340px] max-[1279px]:gap-5 max-[1023px]:grid-cols-1 max-[680px]:gap-4" aria-busy={f.pending}>
        <section className={card} aria-labelledby="tf-h-content">
          <h2 id="tf-h-content" className="m-0 mb-4 font-head text-[15px] font-semibold text-ink">{t('tf.sec.content')}</h2>
          <TitleField f={f} />
          <DescField f={f} />
          <FilesField f={f} active />
        </section>
        <section className={card} aria-labelledby="tf-h-setup">
          <h2 id="tf-h-setup" className="m-0 mb-4 font-head text-[15px] font-semibold text-ink">{t('tf.sec.setup')}</h2>
          <SetupFields f={f} />
        </section>
      </div>

      <div data-testid="tf-bar" className="sticky bottom-[calc(var(--content-pb)*-1)] z-[15] -mx-6 -mb-6 mt-6 flex items-center gap-4 border-t border-line bg-surface px-6 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] max-[1023px]:-mx-4 max-[1023px]:-mb-4 max-[1023px]:px-4 max-[680px]:flex-wrap max-[680px]:gap-2.5">
        <p className="m-0 flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-ink-2 max-[680px]:basis-full max-[680px]:text-xs" aria-live="polite" data-testid="tf-sum">
          <SummaryLine f={f} users={people?.data} />
        </p>
        <div className="flex flex-none gap-2 max-[680px]:flex-1">
          <Button asChild variant="outline" size="md" className="h-[38px] max-[680px]:h-11 max-[680px]:flex-1">
            <Link href={back}>{t('app.close')}</Link>
          </Button>
          {draftable && (
            <Button type="button" variant="outline" size="md" onClick={onSaveDraft} disabled={f.pending} title={t('dr.local')} className="h-[38px] max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1 max-[680px]:px-2" data-testid="tf-save-draft">
              {t('tf.draft.save')}<PhaseBBadge />
            </Button>
          )}
          <Button type="button" size="md" onClick={onSubmit} disabled={f.pending} className="h-[38px] px-4 max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1" data-testid="tf-submit">
            {f.pending ? <span aria-hidden className="size-3.5 flex-none animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Plus aria-hidden />}
            {t('page.new')}
          </Button>
        </div>
        <span className="sr-only" aria-live="assertive">{f.pending ? t('tf.busy.create') : ''}</span>
      </div>
    </div>
  );
}

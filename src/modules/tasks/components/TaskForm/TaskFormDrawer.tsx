'use client';

/**
 * Ngăn trượt phải Tạo / Sửa công việc V2 (preview `TaskForm.openDrawer` — bản compact 1 cột, rộng 720).
 * - Tạo: bấm nền / Esc / Đóng khi đã nhập → hỏi [Bỏ] [Tiếp tục sửa] [Lưu nháp]; nháp CHỈ lưu localStorage (Phase B).
 *   "Mở dạng trang đầy đủ" chuyển dữ liệu đang nhập (kể cả tệp) sang /tasks/new?from=panel.
 * - Sửa: có thay đổi mà đóng → chỉ hỏi [Bỏ thay đổi] [Tiếp tục sửa] (không lưu nháp sửa).
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Maximize2, X, Plus, Check, Trash2, FileQuestion, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/States';
import { PhaseBBadge } from '@/shared/ui/PhaseBBadge';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { cn } from '@/lib/utils';
import { useTaskDetail, TaskLoadError } from '../../hooks/useTaskDetail';
import { useAssignableUsers } from '../../hooks/useAssignableUsers';
import type { TaskDetail } from '../../services/task-query.service';
import { FIELD_ORDER } from './form-logic';
import { useTaskForm, type TaskFormModel } from './useTaskForm';
import { TitleField, DescField, SetupFields, FilesField, TopNote, SummaryLine, SetupIcon, focusField } from './TaskFormFields';
import { ChoiceDialog } from './ChoiceDialog';
import { setHandoff } from './handoff';

export interface TaskFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  /** Sửa: việc cần sửa */
  taskId?: string | null;
  /** Tạo: mở nháp có sẵn */
  draftId?: string | null;
  onClose: () => void;
  /** Nút "Mở lại" trong toast sau khi lưu nháp */
  onReopenDraft?: (draftId: string) => void;
}

const iconBtn = 'grid size-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:size-11';

export function TaskFormDrawer({ open, mode, taskId, draftId, onClose, onReopenDraft }: TaskFormDrawerProps) {
  const closeReq = React.useRef<() => void>(onClose);
  const intercept = (e: Event) => { e.preventDefault(); closeReq.current(); };
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) closeReq.current(); }}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        data-testid="task-form-drawer"
        onEscapeKeyDown={intercept}
        onPointerDownOutside={intercept}
        onInteractOutside={(e) => e.preventDefault()}
        className="v2-drawer flex w-full flex-col gap-0 border-0 bg-surface p-0 sm:max-w-[720px] max-[680px]:max-w-none"
      >
        {open && (mode === 'edit'
          ? <EditLoader taskId={taskId ?? ''} onClose={onClose} closeReq={closeReq} />
          : <CreateGate draftId={draftId ?? null} onClose={onClose} closeReq={closeReq} onReopenDraft={onReopenDraft} />)}
      </SheetContent>
    </Sheet>
  );
}

type CloseReq = React.MutableRefObject<() => void>;

function DrawerHeader({ title, onClose, onFull }: { title: React.ReactNode; onClose: () => void; onFull?: () => void }) {
  const t = useTranslations();
  return (
    <header className="flex h-14 flex-none items-center gap-1 border-b border-line pl-6 pr-3 max-[680px]:pl-4 max-[680px]:pr-2">
      <SheetTitle asChild>
        <h2 className="m-0 flex min-w-0 items-center truncate font-head text-[17px] font-semibold text-ink max-[680px]:text-[15px]">{title}</h2>
      </SheetTitle>
      <span className="flex-1" />
      {onFull && (
        <Button type="button" variant="subtle" size="xs" onClick={onFull} title={t('tf.full')} className="max-[680px]:h-11 max-[680px]:px-2.5" data-testid="tf-full">
          <Maximize2 aria-hidden />
          <span className="max-[680px]:sr-only">{t('tf.full')}</span>
        </Button>
      )}
      <span aria-hidden className="mx-1 h-5 w-px bg-line" />
      <button type="button" onClick={onClose} className={iconBtn} aria-label={t('app.close')} title={t('app.close')} data-testid="tf-close">
        <X aria-hidden className="size-5" />
      </button>
    </header>
  );
}

function EditLoader({ taskId, onClose, closeReq }: { taskId: string; onClose: () => void; closeReq: CloseReq }) {
  const t = useTranslations();
  const { data: task, isLoading, error, refetch } = useTaskDetail(taskId);
  React.useEffect(() => { if (!task) closeReq.current = onClose; }, [task, onClose, closeReq]);
  if (task) return <FormBody key={task.id} mode="edit" task={task} onClose={onClose} closeReq={closeReq} />;
  const status = error instanceof TaskLoadError ? error.status : null;
  return (
    <>
      <DrawerHeader title={t('tf.title.edit')} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5 max-[680px]:px-4">
        {isLoading || !taskId ? <FormSkeleton />
          : status === 404 || status === 403
            ? <EmptyState icon={FileQuestion} title={t('td.nf.t', { id: '' })} description={t('tdx.nf.d')} />
            : <ErrorState title={t('td.ne.t')} description={t('td.ne.d')} onRetry={() => void refetch()} />}
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-3.5" aria-busy="true">
      <Skeleton className="h-4 w-1/4" /><Skeleton className="h-11" />
      <Skeleton className="h-4 w-1/5" /><Skeleton className="h-40" />
      <Skeleton className="h-56" />
    </div>
  );
}

function CreateGate(props: { draftId: string | null; onClose: () => void; closeReq: CloseReq; onReopenDraft?: (id: string) => void }) {
  const { status } = useSession();
  if (status === 'loading') return <div className="px-7 py-5"><FormSkeleton /></div>;
  return <FormBody mode="create" {...props} />;
}

function FormBody({
  mode, task, draftId, onClose, closeReq, onReopenDraft,
}: {
  mode: 'create' | 'edit';
  task?: TaskDetail;
  draftId?: string | null;
  onClose: () => void;
  closeReq: CloseReq;
  onReopenDraft?: (id: string) => void;
}) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const router = useRouter();
  const confirm = useConfirm();
  const f = useTaskForm({ mode, task, draftId });
  const { data: people } = useAssignableUsers();
  const [ask, setAsk] = React.useState(false);
  const isCreate = mode === 'create';

  const requestClose = React.useCallback(() => {
    if (f.pending) return;
    if (!f.dirty) { onClose(); return; }
    setAsk(true);
  }, [f.pending, f.dirty, onClose]);
  React.useEffect(() => { closeReq.current = requestClose; }, [requestClose, closeReq]);

  async function onSubmit() {
    const r = await f.submit();
    if (!r.ok) {
      if (r.reason === 'invalid') focusField(FIELD_ORDER.find((k) => r.errors[k]));
      else { toast.error(t('tf.toast.err')); requestAnimationFrame(() => document.getElementById('tf-srv')?.focus()); }
      return;
    }
    if (r.created) toast.success(t('tf.toast.created', { id: r.created.taskCode ?? '', s: t(`st.${r.created.status}`) }));
    else toast.success(t('tf.toast.saved', { id: task?.taskCode ?? '' }));
    onClose();
  }

  function onSaveDraft() {
    const d = f.saveAsDraft();
    setAsk(false);
    if (!d) { toast.error(t('tfx.draft.saveErr')); return; }
    toast.success(t('dr.toast.saved'), onReopenDraft ? { action: { label: t('dr.toast.reopen'), onClick: () => onReopenDraft(d.id) } } : undefined);
    onClose();
  }

  async function onDeleteDraft() {
    const ok = await confirm({ title: t('dr.del.t'), description: t('dr.del.d'), confirmText: t('tf.draft.del'), danger: true });
    if (!ok) return;
    f.deleteDraft();
    toast.success(t('dr.toast.deleted'));
    onClose();
  }

  function toFull() {
    setHandoff({ values: f.values, base: f.base, draftId: f.draftId, files: f.files });
    onClose();
    router.push('/tasks/new?from=panel');
  }

  const title = mode === 'edit'
    ? t('tfx.editOf', { id: task?.taskCode ?? '' })
    : f.draftId ? <>{t('tf.draft.title')}<PhaseBBadge /></> : t('tf.title.new');

  if (isCreate && f.draftMissing) {
    return (
      <>
        <DrawerHeader title={t('tf.title.new')} onClose={onClose} />
        <div className="px-7 py-5"><EmptyState icon={FileQuestion} title={t('tfx.draft.nf.t')} description={t('tfx.draft.nf.d')} /></div>
      </>
    );
  }

  return (
    <>
      <DrawerHeader title={title} onClose={requestClose} onFull={isCreate ? toFull : undefined} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pb-7 pt-5 [scrollbar-width:thin] max-[680px]:px-4 max-[680px]:pb-6 max-[680px]:pt-4" aria-busy={f.pending}>
        {f.draftId && (
          <p className="m-0 mb-4 flex items-start gap-2 rounded-ctl bg-c-draft/15 px-3 py-2.5 text-[13px] leading-snug text-ink-2" data-testid="tf-draft-note">
            <Info aria-hidden className="mt-0.5 size-4 flex-none text-ink-3" />
            <span>{t('tf.draft.note')} {t('tfx.draft.noFiles')}</span>
          </p>
        )}
        <TopNote f={f} errMsg={errMsg} />
        <TitleField f={f} />
        <DescField f={f} compact />
        <section aria-labelledby="tf-set-h" className="mb-5 mt-1 rounded-card border border-line bg-surface-2 px-4 pb-1 pt-4 max-[680px]:-mx-1 max-[680px]:px-3">
          <h3 id="tf-set-h" className="m-0 mb-3.5 flex items-center gap-2 font-head text-sm font-semibold text-ink"><SetupIcon />{t('tf.sec.setup')}</h3>
          <div className="[&_.tf-modes]:grid-cols-2 max-[680px]:[&_.tf-modes]:grid-cols-1 [&_.tf-pl]:max-h-[212px]">
            <SetupFields f={f} compact />
          </div>
        </section>
        <FilesField f={f} active={!ask} />
      </div>
      <footer className="flex flex-none flex-col gap-2.5 border-t border-line bg-surface py-3 pl-7 pr-5 pb-[calc(12px+env(safe-area-inset-bottom))] max-[680px]:px-4">
        <p className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-ink-2 max-[680px]:text-xs" aria-live="polite" data-testid="tf-sum">
          <SummaryLine f={f} users={people?.data} />
        </p>
        <div className="flex items-center gap-2">
          {f.draftId && (
            <Button type="button" variant="neg" size="md" onClick={onDeleteDraft} disabled={f.pending} className="h-[38px] max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1 max-[680px]:px-2">
              <Trash2 aria-hidden className="max-[680px]:hidden" />{t('tf.draft.del')}
            </Button>
          )}
          <span className="flex-1 max-[680px]:hidden" />
          {isCreate ? (
            <Button type="button" variant="outline" size="md" onClick={onSaveDraft} disabled={f.pending} title={t('dr.local')} className="h-[38px] max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1 max-[680px]:px-2" data-testid="tf-save-draft">
              {t('tf.draft.save')}<PhaseBBadge />
            </Button>
          ) : (
            <Button type="button" variant="outline" size="md" onClick={requestClose} disabled={f.pending} className="h-[38px] max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1">
              {t('app.close')}
            </Button>
          )}
          <Button type="button" size="md" onClick={onSubmit} disabled={f.pending} aria-disabled={f.pending} className={cn('h-[38px] px-4 max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1 max-[680px]:px-2')} data-testid="tf-submit">
            {f.pending
              ? <span aria-hidden className="size-3.5 flex-none animate-spin rounded-full border-2 border-current border-r-transparent" />
              : isCreate ? <Plus aria-hidden className="max-[680px]:hidden" /> : <Check aria-hidden className="max-[680px]:hidden" />}
            {isCreate ? t('page.new') : t('tf.save')}
          </Button>
        </div>
        <span className="sr-only" aria-live="assertive">{f.pending ? t(isCreate ? 'tf.busy.create' : 'tf.busy.save') : ''}</span>
      </footer>

      {isCreate ? (
        <ChoiceDialog
          open={ask}
          title={t(f.draftId ? 'dr.ask.t2' : 'dr.ask.t')}
          description={f.draftId ? t('dr.ask.d2') : t('dr.ask.d')}
          note={f.files.length ? t('tfx.draft.noFiles') : undefined}
          discardLabel={t(f.draftId ? 'dr.ask.discard2' : 'dr.ask.discard')}
          onDiscard={() => { setAsk(false); onClose(); }}
          onKeep={() => setAsk(false)}
          saveLabel={t('tf.draft.save')}
          onSave={onSaveDraft}
        />
      ) : (
        <ChoiceDialog
          open={ask}
          title={t('tfx.ask.edit.t')}
          description={t('tfx.ask.edit.d')}
          discardLabel={t('dr.ask.discard2')}
          onDiscard={() => { setAsk(false); onClose(); }}
          onKeep={() => setAsk(false)}
        />
      )}
    </>
  );
}

export type { TaskFormModel };

'use client';

/**
 * Ngăn xem nhanh V2 (thay TaskQuickViewSheet V1) — preview `App.taskDetail(t,{mode:'drawer'})`.
 * Rộng ~560, nền canvas, các khối có khung; ‹ › chuyển việc trước/sau khi nơi mở truyền `ids`;
 * "Mở trang đầy đủ"; chân ngăn có nút hành động chính (quyền V1, hộp thoại V1).
 */
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Maximize2, X, Info, Workflow, FileText, MessageSquare, FileQuestion } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Block } from '@/shared/ui/Block';
import { KvGrid } from '@/shared/ui/KvGrid';
import { ErrorState, EmptyState } from '@/shared/ui/States';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import { useTaskDetail, TaskLoadError } from '../../hooks/useTaskDetail';
import type { TaskDetail } from '../../services/task-query.service';
import { drawerNav } from './detail-logic';
import { useTaskDetailModel, type TaskDetailModel } from './useTaskDetailModel';
import { MainActionButtons, StarButton, DetailMoreMenu, DetailModals } from './DetailActions';
import { JourneyList, HolderLine, useTurnText, holderBox } from './DetailJourney';
import { useSummaryParts } from './DetailSummary';
import { DescriptionBlock, AllFailedBanner, CancelNote } from './DetailBlocks';
import { CommentsPanel, useCommentCount } from './DetailComments';
import { FileRow } from './DetailFiles';
import { fmtDateTime, ver } from './ReportDialog';
import { DrawerSkeleton } from './TaskDetailSkeleton';

export interface TaskDetailDrawerProps {
  /** Việc đang mở; null = đóng */
  taskId: string | null;
  /** Danh sách id theo thứ tự nơi mở (danh sách/bảng) → bật ‹ › */
  ids?: string[];
  onNavigate?: (id: string) => void;
  onClose: () => void;
}

const iconBtn = 'grid size-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function TaskDetailDrawer({ taskId, ids, onNavigate, onClose }: TaskDetailDrawerProps) {
  const t = useTranslations();
  // giữ id cuối để nội dung không biến mất trong lúc ngăn trượt ra
  const [shownId, setShownId] = React.useState(taskId);
  React.useEffect(() => { if (taskId) setShownId(taskId); }, [taskId]);
  const id = taskId ?? shownId ?? '';
  const { data: task, isLoading, error, refetch } = useTaskDetail(id);
  const nav = drawerNav(ids, id);
  const step = (to: string | null) => { if (to && onNavigate) onNavigate(to); };

  const status = error instanceof TaskLoadError ? error.status : null;

  return (
    <Sheet open={!!taskId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        data-testid="task-drawer"
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).closest('input,textarea,[contenteditable="true"]')) return;
          if (e.key === 'ArrowLeft' && nav.prevId) step(nav.prevId);
          if (e.key === 'ArrowRight' && nav.nextId) step(nav.nextId);
        }}
        className="v2-drawer flex w-full flex-col gap-0 border-0 bg-surface p-0 sm:max-w-[560px] max-[680px]:max-w-none"
      >
        <header className="flex h-14 flex-none items-center gap-1 border-b border-line pl-4 pr-3 max-[680px]:pl-3 max-[680px]:pr-2">
          <button type="button" onClick={onClose} className="-ml-1.5 hidden h-9 items-center gap-1 rounded-md pl-1 pr-2.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-[680px]:inline-flex">
            <ChevronLeft aria-hidden className="size-5" />{t('td.back')}
          </button>
          {nav.n > 0 && (
            <div role="group" className="flex items-center">
              <button type="button" className={iconBtn} aria-label={t('td.prev')} disabled={!nav.prevId} onClick={() => step(nav.prevId)}>
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button type="button" className={iconBtn} aria-label={t('td.next')} disabled={!nav.nextId} onClick={() => step(nav.nextId)}>
                <ChevronRight aria-hidden className="size-5" />
              </button>
              {nav.i > -1 && (
                <span className="ml-1.5 font-mono text-xs text-ink-3" aria-label={t('td.pos', { i: nav.i + 1, n: nav.n })} data-testid="drawer-pos">
                  {nav.i + 1} / {nav.n}
                </span>
              )}
            </div>
          )}
          <span className="flex-1" />
          {task && (
            <Button asChild variant="subtle" size="xs" className="max-[680px]:px-2">
              <Link href={`/tasks/${task.id}`} onClick={onClose} title={t('td.openFull')}>
                <Maximize2 aria-hidden />
                <span className="max-[680px]:sr-only">{t('td.openFull')}</span>
              </Link>
            </Button>
          )}
          <span aria-hidden className="mx-1 h-5 w-px bg-line max-[680px]:hidden" />
          <button type="button" onClick={onClose} className={cn(iconBtn, 'max-[680px]:hidden')} aria-label={t('app.close')}>
            <X aria-hidden className="size-5" />
          </button>
        </header>

        {task ? (
          <DrawerBody key={task.id} task={task} />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto bg-canvas px-5 pb-7 pt-4 max-[680px]:px-3">
            <SheetTitle className="sr-only">{t('td.detail')}</SheetTitle>
            {isLoading || !id ? <DrawerSkeleton />
              : status === 404 || status === 403
                ? <EmptyState icon={FileQuestion} title={t('td.nf.t', { id })} description={t('tdx.nf.d')} />
                : <ErrorState title={t('td.ne.t')} description={t('td.ne.d')} onRetry={() => void refetch()} />}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ task }: { task: TaskDetail }) {
  const t = useTranslations();
  const model = useTaskDetailModel(task);
  const turnText = useTurnText(model);
  const { info } = useSummaryParts(model);
  const cmCount = useCommentCount(task.id);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-canvas px-5 pb-7 pt-4 [scrollbar-width:thin] max-[680px]:gap-2.5 max-[680px]:px-3 max-[680px]:pb-6 max-[680px]:pt-3">
        <div className="px-0.5 pb-1 pt-0.5">
          <div className="flex min-h-8 flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <span className="font-mono">{task.taskCode}</span>
            {task.hdNguonNhap === 'helpdesk' && task.hdCode && (
              <span className="rounded-pill border border-line bg-surface px-2 py-0.5 font-mono text-xs">HD-{task.hdCode}</span>
            )}
            <span className="-mr-1.5 ml-auto flex items-center gap-0.5">
              <StarButton model={model} className="size-8" />
              <DetailMoreMenu model={model} drawer triggerClassName="size-8" />
            </span>
          </div>
          <SheetTitle asChild>
            <h2 className="m-0 mt-1 font-head text-xl font-semibold leading-[1.35] text-ink [overflow-wrap:anywhere]">{task.title}</h2>
          </SheetTitle>
        </div>

        <AllFailedBanner model={model} />

        <Block title={t('td.info')} icon={Info} level={3} flush>
          <KvGrid items={info} />
        </Block>

        <Block title={t('td.journey')} icon={Workflow} level={3} aux={t('td.stepOf', { i: model.journey.cur + 1, n: model.journey.n })}>
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <JourneyList journey={model.journey} />
          </div>
          <div className={cn(holderBox, 'mt-3.5 rounded-ctl bg-surface-2 px-3 py-2.5')} data-testid="holder">
            <HolderLine holder={model.holder} status={task.status} />
          </div>
          <CancelNote model={model} className="mt-3" />
        </Block>

        <DescriptionBlock html={task.content} />
        <DrawerReport model={model} />

        <Block title={t('td.tab.cm')} icon={MessageSquare} level={3} count={cmCount || undefined}>
          <CommentsPanel model={model} compact />
        </Block>
      </div>

      {model.actions.main.length > 0 && (
        <footer className="flex flex-none items-center gap-2 border-t border-line bg-surface py-3 pl-6 pr-5 pb-[calc(12px+env(safe-area-inset-bottom))] max-[680px]:px-4">
          <p className="m-0 flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold text-primary-text max-[680px]:hidden">
            <span aria-hidden className="size-2 flex-none rounded-full bg-primary-text" />
            <span className="line-clamp-2 leading-snug">{turnText}</span>
          </p>
          <MainActionButtons model={model} className="max-[680px]:flex-1" buttonClassName="h-[38px] px-4 max-[680px]:h-11 max-[680px]:flex-1" />
        </footer>
      )}

      <DetailModals model={model} />
    </>
  );
}

/** Báo cáo trong ngăn: báo cáo mới nhất của người đã báo cáo đầu tiên + link xem tất cả ở trang đầy đủ. */
function DrawerReport({ model }: { model: TaskDetailModel }) {
  const t = useTranslations();
  const f = useFormat();
  const { task } = model;
  if (!['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED'].includes(task.status)) return null;
  const reps = task.assignees.filter((a) => a.status === 'COMPLETED' && a.reports.length);
  if (!reps.length) return null;
  const a = reps[0];
  const r = a.reports[a.reports.length - 1];
  return (
    <Block
      title={t('td.report')}
      icon={FileText}
      level={3}
      count={reps.length > 1 ? reps.length : undefined}
      aux={reps.length > 1 ? <Link href={`/tasks/${task.id}#results`} className="text-primary-text hover:underline">{t('td.allReports', { n: reps.length })}</Link> : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <b className="font-semibold text-ink">{a.user.displayName}</b>
        <span className="text-xs text-ink-3">{fmtDateTime(r.submittedAt, f.locale)}{a.reports.length > 1 ? ` · ${ver(r)}` : ''}</span>
      </div>
      <div className="mt-1.5 line-clamp-[8] whitespace-pre-line rounded-[10px] bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">{r.content}</div>
      {r.attachments.length > 0 && <div className="mt-3 grid gap-2">{r.attachments.map((x) => <FileRow key={x.id} file={x} />)}</div>}
    </Block>
  );
}

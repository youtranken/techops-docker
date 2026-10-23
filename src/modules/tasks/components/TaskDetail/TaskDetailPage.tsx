'use client';

/**
 * Trang chi tiết công việc V2 (preview `task.html` / `App.taskDetail(t,{mode:'page'})`).
 * Bố cục: Quay lại · đầu trang (meta, tiêu đề, dòng nhắc lượt | cụm nút gọn) · thanh tóm tắt · Hành trình ·
 * lưới 2 cột ≥1200 (Mô tả, Kết quả, tabs | Tệp, Helpdesk, Thông tin thêm) / 1 cột nhỏ hơn.
 * ≤680: ★ Sửa ⋯ lên hàng "Quay lại", nút chính thành thanh dính đáy (cao 44px).
 */
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Workflow, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryBar } from '@/shared/ui/SummaryBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { TaskDetail } from '../../services/task-query.service';
import { useTaskDetailModel } from './useTaskDetailModel';
import { MainActionButtons, StarButton, EditButton, DetailMoreMenu, DetailModals } from './DetailActions';
import { JourneyList, HolderSlot, useTurnText, useWaitText } from './DetailJourney';
import { useSummaryParts } from './DetailSummary';
import {
  DescriptionBlock, ResultsBlock, FilesBlock, HelpdeskBlock, ExtraBlock, AllFailedBanner, CancelNote, HistoryPanel, historyCount,
} from './DetailBlocks';
import { CommentsPanel, useCommentCount } from './DetailComments';
import { ExtensionsPanel } from './DetailExtensions';

export function TaskDetailPage({ task }: { task: TaskDetail }) {
  const t = useTranslations();
  const model = useTaskDetailModel(task);
  const turnText = useTurnText(model);
  const waitText = useWaitText(model);
  const { summary } = useSummaryParts(model);
  const cmCount = useCommentCount(task.id);
  const hasAct = model.actions.main.length > 0;
  const code = task.taskCode ?? '';
  const [tab, setTab] = React.useState('cm');

  return (
    <div className={cn('relative', hasAct && 'max-[680px]:pb-[72px]')} data-testid="task-detail-page">
      <div className="-ml-2.5 -mt-1.5 mb-2">
        <Button asChild variant="subtle" size="xs">
          <Link href="/tasks"><ArrowLeft aria-hidden />{t('td.back')}</Link>
        </Button>
      </div>

      <header className="mb-4 flex flex-wrap items-start gap-x-6 gap-y-3 max-[680px]:mb-3.5 max-[680px]:gap-2.5">
        <div className="min-w-0 flex-[1_1_360px] max-[900px]:basis-full">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            {code && <span className="font-mono">{code}</span>}
            {task.hdNguonNhap === 'helpdesk' && task.hdCode && (
              <><span aria-hidden className="text-ink-3">·</span><span className="font-mono">HD-{task.hdCode}</span></>
            )}
            <span aria-hidden className="text-ink-3">·</span>
            <span className="inline-flex items-center gap-1.5"><Workflow aria-hidden className="size-3.5 text-ink-3" />
              {t(task.workflowMode === 'IMMEDIATE' ? 'td.mode.direct' : 'td.mode.approval')}</span>
            {task.isForceMode && (
              <><span aria-hidden className="text-ink-3">·</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-danger"><Lock aria-hidden className="size-3.5" />{t('td.force')}</span></>
            )}
          </div>
          <h1 tabIndex={-1} className="m-0 mt-1.5 font-head text-2xl font-semibold leading-[1.35] tracking-[-0.015em] text-ink [overflow-wrap:anywhere] focus:outline-none max-[680px]:text-xl">
            {task.title}
          </h1>
          {turnText ? (
            <p className="m-0 mt-2 flex items-center gap-2 text-[13px] font-medium text-primary-text" data-testid="turn">
              <span aria-hidden className="size-[7px] flex-none rounded-full bg-primary-text" />{turnText}
            </p>
          ) : (
            <p className="m-0 mt-2 text-[13px] text-ink-2">{waitText}</p>
          )}
        </div>

        <div className="ml-auto flex flex-none items-center gap-1 pt-6 max-[900px]:ml-0 max-[900px]:pt-0 max-[680px]:absolute max-[680px]:-right-1.5 max-[680px]:-top-2 max-[680px]:m-0 max-[680px]:p-0">
          {hasAct && (
            <>
              <MainActionButtons
                model={model}
                className="max-[680px]:fixed max-[680px]:inset-x-0 max-[680px]:bottom-0 max-[680px]:z-30 max-[680px]:border-t max-[680px]:border-line max-[680px]:bg-surface max-[680px]:px-4 max-[680px]:pb-[calc(10px+env(safe-area-inset-bottom))] max-[680px]:pt-2.5 max-[680px]:shadow-[0_-8px_24px_rgba(15,23,41,.10)] dark:max-[680px]:shadow-none"
                buttonClassName="max-[680px]:h-11 max-[680px]:flex-1"
              />
              <span aria-hidden className="ml-2 mr-1.5 h-6 w-px flex-none bg-line max-[680px]:hidden" />
            </>
          )}
          <StarButton model={model} />
          <EditButton model={model} />
          <DetailMoreMenu model={model} />
        </div>
      </header>

      <AllFailedBanner model={model} className="mb-4" />

      <SummaryBar items={summary} ariaLabel={t('td.sum')} className="mb-4" />

      <section aria-labelledby="jrH" className="mb-4 rounded-card border border-line bg-surface px-[18px] pb-3.5 pt-3 shadow-v2-1 max-[680px]:px-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <h2 id="jrH" className="m-0 flex items-center gap-2 font-head text-sm font-semibold">
            <Workflow aria-hidden className="size-4 text-ink-3" />
            <span>{t('td.journey')}</span>
            <span className="font-body text-xs font-normal text-ink-3">{t('td.stepOf', { i: model.journey.cur + 1, n: model.journey.n })}</span>
          </h2>
          <HolderSlot model={model} className="ml-auto max-[680px]:ml-0 max-[680px]:basis-full" />
        </div>
        <div className="overflow-x-auto pt-0.5 [scrollbar-width:thin] max-[680px]:-mx-4 max-[680px]:px-4 max-[680px]:pb-1">
          <JourneyList journey={model.journey} compact />
        </div>
        <CancelNote model={model} className="mt-3" />
      </section>

      <div className="grid grid-cols-1 items-start gap-4 max-[680px]:gap-3 min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1200px]:grid-rows-[auto_auto_1fr] min-[1200px]:[grid-template-areas:'desc_side'_'res_side'_'tabs_side']">
        <DescriptionBlock html={task.content} className="min-[1200px]:[grid-area:desc]" />
        <ResultsBlock model={model} className="min-[1200px]:[grid-area:res]" />
        <aside aria-label={t('td.infoToggle')} className="min-w-0 min-[1200px]:[grid-area:side]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-start gap-4 max-[680px]:gap-3 min-[1200px]:flex min-[1200px]:flex-col min-[1200px]:items-stretch">
            <FilesBlock task={task} />
            <HelpdeskBlock task={task} />
            <ExtraBlock task={task} />
          </div>
        </aside>
        <section id="comments" className="min-w-0 scroll-mt-4 rounded-card border border-line bg-surface shadow-v2-1 min-[1200px]:[grid-area:tabs]">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="border-b border-line px-4">
              <TabsList aria-label={t('td.sections')} className="border-b-0">
                <TabsTrigger value="cm" count={cmCount ?? task._count.comments} className="h-[46px]">{t('td.tab.cm')}</TabsTrigger>
                <TabsTrigger value="ext" count={`${task.extensions.length}/5`} className="h-[46px]">{t('td.tab.ext')}</TabsTrigger>
                <TabsTrigger value="hist" count={historyCount(task)} className="h-[46px]">{t('td.tab.hist')}</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="cm" className="mt-0 p-4 max-[680px]:p-3.5"><CommentsPanel model={model} /></TabsContent>
            <TabsContent value="ext" className="mt-0 p-4 max-[680px]:p-3.5"><ExtensionsPanel model={model} /></TabsContent>
            <TabsContent value="hist" className="mt-0 p-4 max-[680px]:p-3.5"><HistoryPanel task={task} /></TabsContent>
          </Tabs>
        </section>
      </div>

      <DetailModals model={model} />
    </div>
  );
}

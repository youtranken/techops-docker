'use client';

/**
 * Nút hành động của chi tiết công việc V2. Chỉ hiển thị theo cờ quyền V1 (`detailActions`) và mở đúng hộp thoại V1
 * (`TaskActionModals` dùng chung state với `useTaskActionPanel`; hộp thoại V2 theo khung `ActionDialog` — A2-2).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Check, UserPlus, ArchiveRestore, Star, Pencil, Copy, ArrowRightLeft, CalendarPlus, XCircle, FilePlus2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickMenu, type QuickMenuItem } from '@/shared/ui/QuickMenu';
import { cn } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { TaskActionModals } from '../../actions/components/buttons/TaskActionPanel';
import { useToggleImportant } from '../../hooks/useTaskTracking';
import { TaskFormDrawer } from '../TaskForm/TaskFormDrawer';
import type { DetailActionKey } from './detail-logic';
import type { TaskDetailModel } from './useTaskDetailModel';

type Tone = 'p' | 'neg' | '';
const META: Record<DetailActionKey, { label: string; tone: Tone; icon?: React.ComponentType<{ className?: string }> }> = {
  reassign: { label: 'act.reassign', tone: 'p', icon: UserPlus },
  restore: { label: 'act.restore', tone: 'p', icon: ArchiveRestore },
  'approve-plan': { label: 'act.approve', tone: 'p', icon: Check },
  'reject-plan': { label: 'act.decline', tone: 'neg' },
  'approve-review': { label: 'act.review', tone: 'p', icon: Check },
  'reject-review': { label: 'act.rework', tone: 'neg' },
  acknowledge: { label: 'act.accept', tone: 'p', icon: Check },
  'reject-task': { label: 'act.decline', tone: 'neg' },
  complete: { label: 'act.report', tone: 'p', icon: Check },
  supplement: { label: 'act.supplement', tone: '', icon: FilePlus2 },
  transfer: { label: 'act.transfer', tone: '', icon: ArrowRightLeft },
  extension: { label: 'act.extend', tone: '', icon: CalendarPlus },
  cancel: { label: 'act.cancel', tone: 'neg', icon: XCircle },
};

/** Nút chính, xếp ngược để nút chính (primary) nằm bên phải như preview. */
export function MainActionButtons({ model, className, buttonClassName }: { model: TaskDetailModel; className?: string; buttonClassName?: string }) {
  const t = useTranslations();
  const { main } = model.actions;
  if (!main.length) return null;
  return (
    <div className={cn('flex items-center gap-2', className)} role="group" aria-label={t('td.actions')}>
      {[...main].reverse().map((k) => {
        const m = META[k];
        const Icon = m.tone === 'p' ? m.icon : undefined;
        return (
          <Button
            key={k}
            type="button"
            data-action={k}
            variant={m.tone === 'p' ? 'default' : m.tone === 'neg' ? 'neg' : 'outline'}
            size="md"
            disabled={model.panel.anyLoading}
            onClick={() => model.panel.setModal(k)}
            className={buttonClassName}
          >
            {Icon && <Icon aria-hidden />}
            {t(m.label)}
          </Button>
        );
      })}
    </div>
  );
}

export function copyTaskCode(code: string, t: ReturnType<typeof useTranslations>) {
  const done = () => toast.success(t('qa.copied', { id: code }));
  try {
    void navigator.clipboard.writeText(code).then(done, done);
  } catch {
    done();
  }
}

/** ⋯ trong chi tiết: [Sao chép mã] · [Sửa — chỉ ngăn] · [Chuyển giao, Xin gia hạn] · [Hủy] */
export function DetailMoreMenu({ model, drawer, triggerClassName }: { model: TaskDetailModel; drawer?: boolean; triggerClassName?: string }) {
  const t = useTranslations();
  const code = model.task.taskCode ?? model.task.id;
  const item = (k: DetailActionKey): QuickMenuItem => ({
    key: k, label: t(META[k].label), icon: META[k].icon, danger: k === 'cancel', onSelect: () => model.panel.setModal(k),
  });
  const { more } = model.actions;
  return (
    <QuickMenu
      label={t('card.more')}
      triggerClassName={cn('size-9', triggerClassName)}
      groups={[
        [{ key: 'copy', label: t('qa.copy'), icon: Copy, onSelect: () => copyTaskCode(code, t) }],
        drawer && model.permissions.canEdit
          ? [{ key: 'edit', label: t('act.edit'), icon: Pencil, onSelect: () => model.setEditOpen(true) }]
          : [],
        more.filter((k) => k !== 'cancel').map(item),
        more.filter((k) => k === 'cancel').map(item),
      ]}
    />
  );
}

/** ★ quan trọng — chỉ Boss/Admin (như ImportantStarButton V1 — đã xoá ở A2-3; cùng API). */
export function StarButton({ model, className }: { model: TaskDetailModel; className?: string }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const toggle = useToggleImportant();
  if (!model.canStar) return null;
  const on = model.task.isImportant;
  const label = t(on ? 'card.unstar' : 'card.star');
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ id: model.task.id, isImportant: !on }, { onError: (e) => toast.error(errMsg(e)) })}
      className={cn(
        'grid size-9 flex-none place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        on && 'text-amber hover:text-amber',
        className,
      )}
    >
      <Star aria-hidden className="size-[18px]" fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

export function EditButton({ model, className }: { model: TaskDetailModel; className?: string }) {
  const t = useTranslations();
  if (!model.permissions.canEdit) return null;
  return (
    <Button type="button" variant="subtle" size="md" className={cn('px-2.5', className)} onClick={() => model.setEditOpen(true)}>
      <Pencil aria-hidden />
      {t('act.edit')}
    </Button>
  );
}

/** Hộp thoại V1 (hành động + sửa) — đặt 1 lần trong trang/ngăn. */
export function DetailModals({ model }: { model: TaskDetailModel }) {
  const { task } = model;
  return (
    <>
      <TaskActionModals
        panel={model.panel}
        taskId={task.id}
        currentAssigneeIds={task.assignees.map((a) => a.user.id)}
        currentUserId={model.viewerId}
        scheduleEnd={task.scheduleEnd ?? undefined}
        taskAssignees={task.assignees}
        task={{ code: task.taskCode, title: task.title, workflowMode: task.workflowMode }}
      />
      <TaskFormDrawer open={model.editOpen} mode="edit" taskId={task.id} onClose={() => model.setEditOpen(false)} />
    </>
  );
}

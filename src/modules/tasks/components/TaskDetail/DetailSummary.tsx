'use client';

/** Ô tóm tắt: thanh 6 ô của trang (SummaryBar) + lưới 8 ô "Thông tin" của ngăn (KvGrid). */
import { useTranslations } from 'next-intl';
import { StatusDot } from '@/shared/ui/StatusDot';
import { PriorityFlag } from '@/shared/ui/PriorityFlag';
import { DueText } from '@/shared/ui/DueText';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import type { SummaryItem } from '@/shared/ui/SummaryBar';
import { useFormat } from '@/i18n/useFormat';
import type { TaskDetailModel } from './useTaskDetailModel';

type U = { id?: string; displayName: string; profile: { avatarUrl: string | null; avatarColor: string } | null };
const Av = ({ u }: { u: U }) => (
  <UserAvatar displayName={u.displayName} avatarUrl={u.profile?.avatarUrl} avatarColor={u.profile?.avatarColor} size="xs" className="ring-2 ring-surface" />
);

export function useSummaryParts(model: TaskDetailModel) {
  const t = useTranslations();
  const f = useFormat();
  const { task } = model;
  // V1 hiển thị người làm còn hiệu lực lẫn đã từ chối; thanh tóm tắt chỉ đếm người còn hiệu lực như preview (t.a)
  const ppl = task.assignees.filter((a) => a.status !== 'REJECTED' && a.status !== 'TRANSFERRED').map((a) => a.user);
  const extN = task.extensions.length;

  const status = <StatusDot status={task.status} strong />;
  const priority = <PriorityFlag level={task.priority.level} name={task.priority.name} className="text-sm" />;
  const due = (
    <>
      <DueText dueDate={task.scheduleEnd} status={task.status} className="text-sm" />
      {task.scheduleEnd && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
        <span className="font-mono text-[13px] text-ink-3">{f.dayMonth(task.scheduleEnd)}</span>
      )}
    </>
  );
  const dueHint = extN ? t('td.extUsed', { n: extN }) : undefined;
  const people = (full: boolean) => ppl.length ? (
    <>
      <span className="flex -space-x-1.5">{ppl.slice(0, 3).map((u) => <Av key={u.id} u={u} />)}</span>
      <span className="min-w-0 truncate text-ink-2" title={ppl.map((u) => u.displayName).join(', ')}>
        {ppl.length === 1 ? ppl[0].displayName : full ? t('td.andN', { a: ppl[0].displayName, n: ppl.length - 1 }) : t('td.pplN', { n: ppl.length })}
      </span>
    </>
  ) : <span className="text-ink-3">{t('card.unassigned')}</span>;
  const creator = (
    <>
      <Av u={task.creator} />
      <span className="min-w-0 flex-1 truncate" title={task.creator.displayName}>{task.creator.displayName}</span>
    </>
  );
  const type = <span className="min-w-0 truncate">{task.type.name}</span>;
  const mode = <span>{t(task.workflowMode === 'IMMEDIATE' ? 'td.mode.direct' : 'td.mode.approval')}{task.isForceMode ? ` · ${t('td.force')}` : ''}</span>;

  const summary: SummaryItem[] = [
    { key: 'status', label: t('td.status'), value: status },
    { key: 'priority', label: t('td.priority'), value: priority },
    { key: 'due', label: t('td.due'), value: due, hint: dueHint },
    { key: 'ppl', label: t('td.assignees'), value: people(false) },
    { key: 'creator', label: t('td.creator'), value: creator },
    { key: 'type', label: t('td.type'), value: type },
  ];
  const info: SummaryItem[] = [
    { key: 'status', label: t('td.status'), value: status },
    { key: 'priority', label: t('td.priority'), value: priority },
    { key: 'due', label: t('td.due'), value: due, hint: dueHint },
    { key: 'ppl', label: t('td.assignees'), value: people(true) },
    { key: 'creator', label: t('td.creator'), value: creator },
    { key: 'created', label: t('td.created'), value: <span className="font-mono text-[13px]">{f.date(task.createdAt)}</span> },
    { key: 'type', label: t('td.type'), value: type },
    { key: 'mode', label: t('td.mode._'), value: mode },
  ];
  return { summary, info };
}


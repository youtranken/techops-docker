'use client';

/** Hành trình (các bước + ngày) và dòng "Đang ở chỗ …" — preview `.jr` / `.holder` / `.td-holder`. */
import { useTranslations } from 'next-intl';
import { Check, X, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import type { Journey, Holder } from './detail-logic';
import type { TaskDetailModel } from './useTaskDetailModel';

export function JourneyList({ journey, compact }: { journey: Journey; compact?: boolean }) {
  const t = useTranslations();
  const f = useFormat();
  return (
    <ol
      data-testid="journey"
      className={cn('m-0 grid list-none p-0', compact && 'max-[680px]:min-w-[calc(var(--n)*84px)]')}
      style={{ gridTemplateColumns: `repeat(${journey.n}, minmax(0, 1fr))`, ['--n' as string]: journey.n }}
    >
      {journey.steps.map((s, i) => {
        const doneOrCur = s.state !== 'todo';
        const nd = compact ? 'size-4' : 'size-5';
        return (
          <li
            key={s.key}
            aria-current={s.state === 'cur' ? 'step' : undefined}
            data-state={s.state}
            className={cn(
              'relative flex min-w-0 flex-col items-center px-[3px] text-center',
              i > 0 && 'before:absolute before:left-[-50%] before:right-1/2 before:mx-3 before:h-0.5 before:content-[""]',
              compact ? 'before:top-[7px]' : 'before:top-[9px]',
              doneOrCur ? 'before:bg-primary-text' : 'before:bg-line',
            )}
          >
            <span
              className={cn(
                'relative z-[1] grid place-items-center rounded-full', nd,
                s.state === 'done' && 'bg-primary-text text-primary-ink',
                s.state === 'cur' && !s.fin && !s.stop && 'bg-surface shadow-[inset_0_0_0_2px_var(--primary-text),0_0_0_4px_var(--primary-soft)]',
                s.fin && 'bg-c-done text-white dark:text-canvas',
                s.stop && 'bg-ink-3 text-surface',
              )}
            >
              {s.state === 'done' || s.fin ? <Check aria-hidden className={cn(compact ? 'size-2.5' : 'size-3', 'stroke-[3]')} />
                : s.stop ? <X aria-hidden className={cn(compact ? 'size-2.5' : 'size-3', 'stroke-[3]')} />
                : s.state === 'cur' ? <span className={cn('rounded-full bg-primary-text', compact ? 'size-1.5' : 'size-2')} />
                : <span className={cn('rounded-full border-2 border-line-2 bg-surface', compact ? 'size-2' : 'size-2.5')} />}
            </span>
            <span
              className={cn(
                'mt-1.5 text-xs leading-4 text-ink-3',
                s.state === 'done' && 'text-ink-2',
                s.state === 'cur' && 'font-semibold text-primary-text',
                s.fin && 'text-c-done',
                s.stop && 'text-ink-2',
              )}
            >
              {s.stop ? t('st.CANCELLED') : t(`st.${s.key}`)}
            </span>
            <span className="mt-0.5 font-mono text-[11px] leading-4 text-ink-3">{s.at ? f.dayMonth(s.at) : ' '}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** "Đang ở chỗ …" theo `taskHolder`. */
export function HolderLine({ holder, status }: { holder: Holder; status: string }) {
  const t = useTranslations();
  const f = useFormat();
  const ic = 'size-4 flex-none text-ink-3';
  /** Chèn tên in đậm vào câu dịch (next-intl không nhận phần tử React làm đối số {a}). */
  const withWho = (key: string, who: string, values: Record<string, number> = {}) => {
    const MARK = '\uE000';
    const [pre, post = ''] = t(key, { ...values, a: MARK }).split(MARK);
    return <>{pre}<b className="font-semibold text-ink">{who}</b>{post}</>;
  };
  switch (holder.kind) {
    case 'allFailed':
      return <><AlertTriangle aria-hidden className={ic} /><span>{t('td.af.holder')}</span></>;
    case 'closed':
      return <><CheckCircle2 aria-hidden className={ic} /><span>{t('td.closed', { d: f.date(holder.at) })}</span></>;
    case 'cancelled':
      return <><XCircle aria-hidden className={ic} /><span>{t('td.cancelledOn', { d: f.date(holder.at) })}</span></>;
    case 'approver':
      if (!holder.you) return <><Clock aria-hidden className={ic} /><span>{t(`td.wait.${status}`)}</span></>;
      return <><Clock aria-hidden className={ic} /><span>{holder.since ? t('td.atYou', { n: holder.since }) : withWho('td.atNow', t('td.you'))}</span></>;
    case 'people': {
      const first = holder.people[0];
      const who = holder.you ? t('td.you') : first.displayName;
      const label = holder.people.length > 1 ? t('td.andN', { a: who, n: holder.people.length - 1 }) : who;
      const prof = (first as { profile?: { avatarUrl: string | null; avatarColor: string } | null }).profile;
      return (
        <>
          <UserAvatar displayName={first.displayName} avatarUrl={prof?.avatarUrl} avatarColor={prof?.avatarColor} size="xs" />
          <span>
            {!holder.since
              ? withWho('td.atNow', label)
              : holder.you && holder.people.length === 1
                ? t('td.atYou', { n: holder.since })
                : withWho('td.at', label, { n: holder.since })}
          </span>
        </>
      );
    }
    default:
      return <><Clock aria-hidden className={ic} /><span>{t(`td.wait.${status}`)}</span></>;
  }
}

/** Chữ nhắc lượt: "Đến lượt bạn duyệt · đang chờ 2 ngày" (chỉ khi người xem có nút chính). */
export function useTurnText(model: TaskDetailModel): string | null {
  const t = useTranslations();
  const { turn, holder } = model;
  if (!turn.mine || !turn.key) return null;
  let s = t(turn.key);
  const since = holder.kind === 'people' || holder.kind === 'approver' ? holder.since : null;
  if (turn.showDays && since !== null) s += ' · ' + (since > 0 ? t('td.turn.days', { n: since }) : t('td.turn.new'));
  return s;
}

/** Câu chờ khi người xem KHÔNG có lượt (trang). */
export function useWaitText(model: TaskDetailModel): string {
  const t = useTranslations();
  const mine = model.permissions.currentUserAssignee?.status;
  if (mine === 'COMPLETED' && model.task.status === 'IN_PROGRESS') return t('td.wait.reported');
  return t(`td.wait.${model.task.status}`);
}

export const holderBox = 'flex min-w-0 items-center gap-2 text-[13px] text-ink-2';
export function HolderSlot({ model, className }: { model: TaskDetailModel; className?: string }) {
  return (
    <p className={cn(holderBox, 'm-0', className)} data-testid="holder">
      <HolderLine holder={model.holder} status={model.task.status} />
    </p>
  );
}

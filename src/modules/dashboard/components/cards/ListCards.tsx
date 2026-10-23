'use client';

/**
 * Khối danh sách của Tổng quan — dữ liệu V1 giữ nguyên:
 *  - Cần bạn xử lý: `actionItems` (Boss/Admin: Chờ duyệt + Chờ nghiệm thu; Nhân viên: Chờ nhận/Đang làm của mình), tối đa 8.
 *  - Sắp đến hạn: `upcomingDeadlines` (7 ngày tới, chưa xong/hủy), tối đa 8.
 *  - Cập nhật gần đây: `recentTasks` (5 việc mới cập nhật).
 * Bấm dòng → ngăn xem nhanh (‹ › theo thứ tự trong khối).
 */
import { CheckCircle2, CalendarDays, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DueText } from '@/shared/ui/DueText';
import { StatusDot } from '@/shared/ui/StatusDot';
import { useFormat } from '@/i18n/useFormat';
import type { ActionItem, UpcomingDeadline, RecentTask } from '../../services/stats/types';
import { actionVerbKey, clockOf } from '../../view-model/dashboard-logic';
import { useLevelOf } from '../../hooks/usePriorityLevels';
import { DashCard, AllLink, CardEmpty, Row, RowList, Sep } from '../parts/DashCard';
import { RowFlag, Code, People } from '../parts/RowBits';

export type OpenTask = (id: string, ids: string[]) => void;

export function ActionCard({ items, pendingExtensions, isBoss, onOpen }: {
  items: ActionItem[]; pendingExtensions: number; isBoss: boolean; onOpen: OpenTask;
}) {
  const t = useTranslations();
  const levelOf = useLevelOf();
  const ids = items.map((x) => x.id);
  const badge = isBoss && pendingExtensions > 0 ? (
    <span
      title={t('db.act.extBadgeT')}
      data-testid="db-ext-badge"
      className="whitespace-nowrap rounded-pill border border-amber/45 px-2 py-[3px] text-[11px] font-medium leading-none text-amber"
    >
      {t('db.act.extBadge', { n: pendingExtensions })}
    </span>
  ) : null;
  return (
    <DashCard id="db-act" className="v2-db-act" title={t('db.act.t')} count={items.length || null}
      sub={t(isBoss ? 'db.act.sub.boss' : 'db.act.sub.emp')}
      right={<>{badge}<AllLink href="/tasks" /></>}>
      {!items.length ? (
        <CardEmpty icon={CheckCircle2} text={t(isBoss ? 'db.act.empty.boss' : 'db.act.empty.emp')} />
      ) : (
        <RowList>
          {items.map((it) => {
            const verb = actionVerbKey(it.status);
            return (
              <Row key={it.id} testId="db-act-row" onOpen={() => onOpen(it.id, ids)} title={it.title}
                hint={[it.taskCode, it.title].filter(Boolean).join(' · ')}
                lead={<RowFlag name={it.priority?.name} level={levelOf(it.priority?.name)} />}
                right={<DueText dueDate={it.scheduleEnd} status={it.status} className="text-xs" />}
                meta={<>{verb && <span className="font-medium text-primary-text">{t(verb)}</span>}{verb && it.taskCode && <Sep />}<Code code={it.taskCode} /></>}
              />
            );
          })}
        </RowList>
      )}
    </DashCard>
  );
}

export function DueCard({ items, onOpen }: { items: UpcomingDeadline[]; onOpen: OpenTask }) {
  const t = useTranslations();
  const levelOf = useLevelOf();
  const ids = items.map((x) => x.id);
  return (
    <DashCard id="db-due" className="v2-db-due" title={t('db.due.t')} count={items.length || null} sub={t('db.due.sub')} right={<AllLink href="/tasks" />}>
      {!items.length ? (
        <CardEmpty icon={CalendarDays} text={t('db.due.empty')} />
      ) : (
        <RowList>
          {items.map((it) => (
            <Row key={it.id} testId="db-due-row" onOpen={() => onOpen(it.id, ids)} title={it.title}
              hint={[it.taskCode, it.title].filter(Boolean).join(' · ')}
              lead={<RowFlag name={it.priority?.name} level={levelOf(it.priority?.name)} />}
              right={<DueText dueDate={it.scheduleEnd} status={it.status} className="text-xs" />}
              meta={<><StatusDot status={it.status} className="text-xs" />{it.taskCode && <Sep />}<Code code={it.taskCode} /></>}
              aux={<People list={it.assignees} />}
            />
          ))}
        </RowList>
      )}
    </DashCard>
  );
}

export function RecentCard({ items, onOpen }: { items: RecentTask[]; onOpen: OpenTask }) {
  const t = useTranslations();
  const f = useFormat();
  const levelOf = useLevelOf();
  const ids = items.map((x) => x.id);
  return (
    <DashCard id="db-rec" className="v2-db-rec" title={t('db.rec.t')} sub={t('db.rec.sub')} right={<AllLink href="/tasks" />}>
      {!items.length ? (
        <CardEmpty icon={History} text={t('db.rec.empty')} />
      ) : (
        <RowList>
          {items.map((it) => (
            <Row key={it.id} testId="db-rec-row" onOpen={() => onOpen(it.id, ids)} title={it.title}
              hint={[it.taskCode, it.title].filter(Boolean).join(' · ')}
              lead={<RowFlag name={it.priority?.name} level={levelOf(it.priority?.name)} />}
              right={<DueText dueDate={it.scheduleEnd} status={it.status} className="text-xs" />}
              meta={<><StatusDot status={it.status} className="text-xs" />{it.taskCode && <Sep />}<Code code={it.taskCode} /></>}
              aux={<time className="font-mono" dateTime={String(it.updatedAt)}>{f.dayMonth(it.updatedAt)} {clockOf(it.updatedAt)}</time>}
            />
          ))}
        </RowList>
      )}
    </DashCard>
  );
}

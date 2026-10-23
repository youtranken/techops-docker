'use client';

/**
 * A3-1 Tổng quan V2 (preview `docs/previews/ds-v2/dashboard.html`). Dữ liệu = API V1 không đổi:
 * `GET /api/dashboard/stats` (cache server 5 phút như V1) + `GET /api/dashboard/performance`.
 * Vai trò: Boss/Admin và Nhân viên khác nhau ở ô KPI 3–4, khối "Cần bạn xử lý" và dòng chào — đúng như V1.
 */
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { ErrorState } from '@/shared/ui/States';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { usePriorityLevels } from '../hooks/usePriorityLevels';
import { buildKpis, isBossRole, isDashboardEmpty, monthIndex, waitingCount } from '../view-model/dashboard-logic';
import { DashboardHead } from '../components/DashboardHead';
import { KpiStrip } from '../components/KpiStrip';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { ActionCard, DueCard, RecentCard, type OpenTask } from '../components/cards/ListCards';
import { CommentsCard } from '../components/cards/CommentsCard';
import { StatusCard, PriorityCard } from '../components/cards/DistCards';
import { PerfCard } from '../components/cards/PerfCard';

export function DashboardSection({ onOpenTask }: { onOpenTask: OpenTask }) {
  const t = useTranslations();
  const { data: stats, isLoading, isError, refetch, isRefetching, dataUpdatedAt } = useDashboardStats();
  const { data: priorities } = usePriorityLevels();
  const { data: session } = useSession();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !stats) {
    return (
      <section className="rounded-card border border-line bg-surface shadow-v2-1">
        <ErrorState className="py-14" title={t('db.err.t')} description={t('db.err.d')} onRetry={isRefetching ? undefined : () => refetch()} />
      </section>
    );
  }

  const role = session?.user?.role?.name ?? '';
  const boss = isBossRole(role);
  const now = new Date(dataUpdatedAt || Date.now());
  const month = t('db.mon').split('|')[monthIndex(now)];

  return (
    <div data-testid="dashboard" data-role={role}>
      <DashboardHead name={session?.user?.displayName ?? ''} now={now} waiting={waitingCount(stats, role)} isBoss={boss} empty={isDashboardEmpty(stats)} />
      <KpiStrip kpis={buildKpis(stats, role)} />
      <div className="v2-db-grid">
        <ActionCard items={stats.actionItems} pendingExtensions={stats.pendingExtensions} isBoss={boss} onOpen={onOpenTask} />
        <DueCard items={stats.upcomingDeadlines} onOpen={onOpenTask} />
        <CommentsCard items={stats.recentComments} onOpen={onOpenTask} now={now} />
        <PerfCard />
        <StatusCard data={stats.tasksByStatus} month={month} />
        <PriorityCard data={stats.tasksByPriority} flow={stats.tasksByWorkflowMode} priorities={priorities} month={month} />
        <RecentCard items={stats.recentTasks} onOpen={onOpenTask} />
      </div>
    </div>
  );
}

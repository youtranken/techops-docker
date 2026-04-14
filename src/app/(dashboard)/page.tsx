'use client';

import { Suspense } from 'react';
import { FileText, Clock, AlertCircle, CheckCircle, Hourglass, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useDashboardStats } from '@/modules/dashboard/hooks/useDashboardStats';
import { StatCard } from '@/modules/dashboard/components/widgets/StatCard';
import { StatusDonutChart } from '@/modules/dashboard/components/charts/StatusDonutChart';
import { RecentActivities } from '@/modules/dashboard/components/widgets/RecentActivities';
import { PriorityBreakdown } from '@/modules/dashboard/components/charts/PriorityBreakdown';
import { WorkflowDonut } from '@/modules/dashboard/components/charts/WorkflowDonut';
import { RecentCommentsChart } from '@/modules/dashboard/components/widgets/RecentCommentsChart';
import { PerformanceChart } from '@/modules/dashboard/components/charts/PerformanceChart';
import { ActionItemsPanel } from '@/modules/dashboard/components/widgets/ActionItemsPanel';
import { DeadlinesPanel } from '@/modules/dashboard/components/widgets/DeadlinesPanel';
import { DashboardSkeleton } from '@/modules/dashboard/components/DashboardSkeleton';

function DashboardContent() {
  const { data: stats, isLoading, isError } = useDashboardStats();
  const { data: session } = useSession();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Không thể tải dữ liệu. Vui lòng thử lại.
      </div>
    );
  }

  const role = session?.user?.role?.name ?? '';
  const isBoss = ['BOSS', 'ADMIN'].includes(role);
  const slaNum = parseFloat(stats.slaRate);
  const slaColor: 'teal' | 'orange' | 'red' = isNaN(slaNum) ? 'teal' : slaNum >= 80 ? 'teal' : slaNum >= 60 ? 'orange' : 'red';
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-5">

      {/* Row 1 — 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Tổng công việc" value={stats.totalTasks} icon={FileText} color="blue" />
        <StatCard title="Hoàn thành" value={stats.completedTasks} icon={CheckCircle} color="green"
          subtitle={`Tỉ lệ: ${stats.completionRate}%`} progress={parseFloat(stats.completionRate)} />
        <StatCard
          title={isBoss ? 'Chờ duyệt' : 'Đang thực hiện'}
          value={isBoss ? stats.pendingApproval : stats.myInProgress}
          icon={Clock} color="purple" />
        <StatCard
          title={isBoss ? 'Chờ Review' : 'Chờ tiếp nhận'}
          value={isBoss ? stats.pendingReview : stats.myWaitingAck}
          icon={Hourglass} color="purple" />
        <StatCard title="Quá hạn" value={stats.overdueCount} icon={AlertCircle}
          color={stats.overdueCount > 0 ? 'red' : 'green'} />
        <StatCard
          title="SLA đúng hạn"
          value={stats.slaRate === '—' ? '—' : `${stats.slaRate}%`}
          icon={ShieldCheck} color={slaColor}
          subtitle="hoàn thành trước deadline"
          progress={isNaN(slaNum) ? undefined : slaNum} />
      </div>

      {/* Row 2 — 3 khung: Cần xử lý | Sắp hết hạn | Bình luận gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ActionItemsPanel items={stats.actionItems} pendingExtensions={stats.pendingExtensions} isBoss={isBoss} />
        <DeadlinesPanel items={stats.upcomingDeadlines} />
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Bình luận gần đây</span>
          </div>
          <div className="p-3 flex-1 overflow-hidden">
            <RecentCommentsChart comments={stats.recentComments} />
          </div>
        </div>
      </div>
      {/* Row 3 — Performance chart + Status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><PerformanceChart /></div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Biểu đồ Trạng thái · Tháng {currentMonth}</p>
          <StatusDonutChart data={stats.tasksByStatus} />
        </div>
      </div>

      {/* Row 4 — Recent tasks (2/3) + Priority donut + Recent Comments (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Nhiệm vụ gần đây</h2>
            <a href="/tasks" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Xem tất cả</a>
          </div>
          <RecentActivities tasks={stats.recentTasks} />
        </div>
        <div className="flex flex-col gap-5">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex-1">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Biểu đồ Độ ưu tiên · Tháng {currentMonth}</p>
            <PriorityBreakdown data={stats.tasksByPriority} total={stats.totalTasks} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex-1">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Biểu đồ Flow · Tháng {currentMonth}</p>
            <WorkflowDonut data={stats.tasksByWorkflowMode} />
          </div>
        </div>
      </div>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bảng điều khiển</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tổng quan hệ thống TechOps IT Operations</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

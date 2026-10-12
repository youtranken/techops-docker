'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTaskPermissions } from '../../actions/hooks/useTaskPermissions';
import { useMarkSeenOnOpen } from '../../hooks/useTaskTracking';
import { DetailHero } from './DetailHero';
import { DetailTimeline } from './DetailTimeline';
import { DetailTabPanel } from './DetailTabPanel';
import { DetailSidebar } from './DetailSidebar';
import { EditTaskModal } from '../TaskModals/EditTaskModal';
import type { TaskDetail } from '../../services/task-query.service';

interface Props { task: TaskDetail }

export function TaskDetailClient({ task }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const roleName = session?.user?.role?.name ?? '';
  const permissions = useTaskPermissions(task, currentUserId, roleName);
  const currentAssigneeIds = task.assignees.map((a) => a.user.id);
  const isAdmin = roleName === 'ADMIN';

  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  // V2: Boss/Admin mở task Hoàn thành → tính là đã xem
  useMarkSeenOnOpen(task, roleName);

  return (
    <div className="-m-6 h-full flex">

      {/* ── Left col: fixed sections + TabPanel fills remaining ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-700">
        <DetailHero
          task={task}
          permissions={permissions}
          currentAssigneeIds={currentAssigneeIds}
          currentUserId={currentUserId}
          roleName={roleName}
          onBack={() => router.push('/tasks')}
          onEdit={() => setEditTaskId(task.id)}
        />
        <DetailTimeline task={task} />
        <DetailTabPanel
          task={task}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          canApproveExtension={permissions.canApproveExtension}
          canWithdrawExtension={permissions.canWithdrawExtension}
        />
      </div>

      {/* ── Right col: fixed width, independent scroll ── */}
      <div className="w-96 shrink-0 overflow-y-auto bg-slate-50/60 dark:bg-slate-800/40 p-4">
        <DetailSidebar task={task} />
      </div>

      <EditTaskModal taskId={editTaskId} onClose={() => setEditTaskId(null)} />
    </div>
  );
}

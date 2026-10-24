import { Suspense } from 'react';
import { requireMenuAccess } from '@/lib/settings-guard';
import { TaskLogView } from '@/modules/logs/components/LogsPage/TaskLogView';
export const metadata = { title: 'Task Activity — Audit Logs' };

export default async function TaskActivityPage() {
  await requireMenuAccess('logs', 'task_activity');
  return <Suspense><TaskLogView /></Suspense>;
}

import { requireMenuAccess } from '@/lib/settings-guard';
import { TaskActivitySection } from '@/modules/logs/sections/TaskActivitySection';
export const metadata = { title: 'Task Activity — Audit Logs' };

export default async function TaskActivityPage() {
  await requireMenuAccess('logs', 'task_activity');
  return <TaskActivitySection />;
}

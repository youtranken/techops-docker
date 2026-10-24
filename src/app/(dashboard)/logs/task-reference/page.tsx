import { TaskRefView } from '@/modules/logs/components/LogsPage/TaskRefView';

// V1: không chặn theo tính năng ở trang (layout chỉ cần menu `logs`); API chỉ cho ADMIN/BOSS.
export default function TaskReferencePage() {
  return <TaskRefView />;
}

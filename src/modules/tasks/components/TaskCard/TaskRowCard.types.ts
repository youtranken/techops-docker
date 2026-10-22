import type { TaskListItem } from '../../services/task-query.service';
import type { TaskPermissions } from '../../actions/hooks/useTaskPermissions';

export interface TaskRowCardProps {
  task: TaskListItem;
  permissions: TaskPermissions;
  /** V2: Boss/Admin được bật/tắt ★ (nhân viên không thấy ★) */
  canStar?: boolean;
  onOpenQuickView: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onOpenComplete: (taskId: string) => void;
  onOpenTransfer: (taskId: string) => void;
  onOpenRejectTask: (taskId: string) => void;
  onOpenRejectReview: (taskId: string) => void;
  onOpenCancel: (taskId: string) => void;
  onOpenRestore: (taskId: string) => void;
  onOpenSupplement: (taskId: string) => void;
  onOpenRejectPlan: (taskId: string) => void;
  onOpenExtension: (taskId: string) => void;
  onOpenApproveExtension: (taskId: string, extId: string) => void;
}

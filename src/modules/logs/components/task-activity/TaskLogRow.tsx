import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import type { TaskLogEntry } from '../../types';

// ── Action config ─────────────────────────────────────────────────────────────

const G = 'border-transparent bg-green-500  text-white';
const B = 'border-transparent bg-blue-500   text-white';
const R = 'border-transparent bg-red-500    text-white';
const A = 'border-transparent bg-amber-500  text-white';
const P = 'border-transparent bg-purple-500 text-white';
const S = 'border-transparent bg-secondary  text-secondary-foreground';

const ACTION_MAP: Record<string, { label: string; cls: string }> = {
  TASK_CREATED:         { label: 'Tạo task',          cls: B },
  TASK_UPDATED:         { label: 'Cập nhật',          cls: S },
  TASK_CANCELLED:       { label: 'Huỷ task',          cls: R },
  TASK_DELETED:         { label: 'Xoá task',          cls: R },
  PLAN_APPROVED:        { label: 'Duyệt công việc',   cls: G },
  PLAN_REJECTED:        { label: 'Từ chối công việc', cls: R },
  ACKNOWLEDGED:         { label: 'Tiếp nhận',         cls: B },
  REJECTED:             { label: 'Từ chối',           cls: R },
  TRANSFERRED:          { label: 'Chuyển giao',       cls: B },
  COMPLETED:            { label: 'Hoàn thành',        cls: G },
  REVIEW_APPROVED:      { label: 'Chờ Review',        cls: G },
  REVIEW_REJECTED:      { label: 'Yêu cầu sửa',      cls: A },
  REASSIGNED:           { label: 'Phân công lại',     cls: P },
  EXTENSION_REQUESTED:  { label: 'Xin gia hạn',       cls: A },
  EXTENSION_APPROVED:   { label: 'Duyệt gia hạn',     cls: G },
  EXTENSION_REJECTED:   { label: 'Từ chối gia hạn',   cls: R },
  EXTENSION_WITHDRAWN:  { label: 'Rút yêu cầu',       cls: S },
  FORCE_MODE_TOGGLED:   { label: 'Force Mode',        cls: A },
  COMMENT_ADDED:        { label: 'Bình luận',         cls: S },
  STATUS_CHANGED:       { label: 'Đổi trạng thái',    cls: S },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  log: TaskLogEntry;
}

export function TaskLogRow({ log }: Props) {
  const actionCfg = ACTION_MAP[log.action];

  return (
    <TableRow className="hover:bg-muted/40 transition-colors">
      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
      </TableCell>
      <TableCell>
        {log.task?.taskCode ? (
          <span className="font-mono font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-xs">
            {log.task.taskCode}
          </span>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>
        {log.task ? (
          <span className="font-mono text-[11px] text-muted-foreground">{log.task.id}</span>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="max-w-[220px]">
        <p className="text-sm truncate text-muted-foreground">
          {log.task?.title ?? <span className="italic">—</span>}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-xs ${actionCfg?.cls ?? ''}`}>
          {actionCfg?.label ?? log.action}
        </Badge>
      </TableCell>
      <TableCell>
        {log.oldStatus && log.newStatus ? (
          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
            <span className="text-foreground/60">{log.oldStatus}</span>
            {' → '}
            <span className="text-foreground">{log.newStatus}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <p className="text-sm font-medium leading-none whitespace-nowrap">{log.performedBy.displayName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{log.performedBy.role.name}</p>
      </TableCell>
    </TableRow>
  );
}

'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TaskLogEntry } from '../types';

interface TaskTimelineProps {
  logs: TaskLogEntry[];
}

const ACTION_ICON: Record<string, string> = {
  TASK_CREATED: '📋',
  TASK_UPDATED: '✏️',
  TASK_CANCELLED: '🚫',
  PLAN_APPROVED: '✅',
  PLAN_REJECTED: '❌',
  ACKNOWLEDGED: '👋',
  REJECTED: '❌',
  TRANSFERRED: '🔄',
  COMPLETED: '🎉',
  REVIEW_APPROVED: '✅',
  REVIEW_REJECTED: '🔁',
  REASSIGNED: '👥',
  EXTENSION_REQUESTED: '📅',
  EXTENSION_APPROVED: '✅',
  EXTENSION_REJECTED: '❌',
  COMMENT_ADDED: '💬',
  STATUS_CHANGED: '🔄',
  FORCE_MODE_TOGGLED: '⚡',
};

const ACTION_LABELS: Record<string, string> = {
  TASK_CREATED: 'Tạo task',
  TASK_UPDATED: 'Cập nhật',
  TASK_CANCELLED: 'Huỷ task',
  PLAN_APPROVED: 'Duyệt công việc',
  PLAN_REJECTED: 'Từ chối công việc',
  ACKNOWLEDGED: 'Tiếp nhận',
  REJECTED: 'Từ chối',
  TRANSFERRED: 'Chuyển giao',
  COMPLETED: 'Hoàn thành',
  REVIEW_APPROVED: 'Chờ Review',
  REVIEW_REJECTED: 'Yêu cầu sửa lại',
  REASSIGNED: 'Phân công lại',
  EXTENSION_REQUESTED: 'Xin gia hạn',
  EXTENSION_APPROVED: 'Duyệt gia hạn',
  EXTENSION_REJECTED: 'Từ chối gia hạn',
  EXTENSION_WITHDRAWN: 'Rút yêu cầu gia hạn',
  COMMENT_ADDED: 'Bình luận',
  STATUS_CHANGED: 'Đổi trạng thái',
  FORCE_MODE_TOGGLED: 'Bật/tắt Force Mode',
};

export function TaskTimeline({ logs }: TaskTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Chưa có lịch sử
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {logs.map((log, idx) => (
        <div key={log.id} className="flex gap-3 pb-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <span className="text-base">{ACTION_ICON[log.action] ?? '🔵'}</span>
            {idx < logs.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
            )}
          </div>

          {/* Content */}
          <div className={cn('flex-1 pb-4', idx === logs.length - 1 && 'pb-0')}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {ACTION_LABELS[log.action] ?? log.action}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {format(new Date(log.createdAt), 'dd/MM HH:mm', { locale: vi })}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {log.performedBy.displayName}
              {log.oldStatus && log.newStatus && (
                <span className="ml-2 text-gray-400">
                  {log.oldStatus} → {log.newStatus}
                </span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

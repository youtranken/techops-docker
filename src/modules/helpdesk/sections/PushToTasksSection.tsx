'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PushResult } from '@/modules/helpdesk/types';
import { usePushToTasks } from '../hooks/usePushToTasks';

export function PushToTasksSection() {
  const qc = useQueryClient();
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  const pushMutation = usePushToTasks();

  function handlePush() {
    pushMutation.mutate(undefined, {
      onSuccess: (r) => {
        setPushResult(r);
        void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      },
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm font-semibold">Đẩy sang Task</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tạo Task từ các ticket đã có IT Support trong danh sách chờ. Ticket không có IT Support sẽ bị bỏ qua.
          </p>
        </div>
        <button
          onClick={handlePush}
          disabled={pushMutation.isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors whitespace-nowrap"
        >
          {pushMutation.isPending ? 'Đang xử lý...' : 'Đẩy sang Task'}
        </button>
      </div>

      {pushMutation.isError && (
        <p className="mt-3 text-sm text-destructive">
          Lỗi: {pushMutation.error?.message}
        </p>
      )}

      {pushResult && (
        <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-xs space-y-1">
          <p className="font-semibold text-green-700 dark:text-green-400">Hoàn thành</p>
          <p className="text-green-700 dark:text-green-300">
            Đã tạo: <strong>{pushResult.pushed}</strong> task &bull;{' '}
            Bỏ qua (trùng): <strong>{pushResult.skipped}</strong> &bull;{' '}
            Không tìm thấy user: <strong>{pushResult.noUser}</strong>
          </p>
          {pushResult.errors.length > 0 && (
            <p className="text-destructive">
              Lỗi ticket: {pushResult.errors.map((e) => e.hdId).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

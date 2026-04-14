'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTaskDetail } from '../../hooks/useTaskDetail';
import { useTaskPermissions } from '../../actions/hooks/useTaskPermissions';

export function useQuickViewData(
  taskId: string,
  currentUserId: string,
  role: string,
) {
  const queryClient = useQueryClient();
  const { data: task, isLoading, isError } = useTaskDetail(taskId);
  const permissions = useTaskPermissions(task ?? null, currentUserId, role);
  const currentAssigneeIds = task?.assignees.map((a) => a.user.id) ?? [];

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  }

  return { task, isLoading, isError, permissions, currentAssigneeIds, refresh };
}

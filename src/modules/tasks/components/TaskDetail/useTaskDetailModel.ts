'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTaskPermissions } from '../../actions/hooks/useTaskPermissions';
import { useTaskActionPanel } from '../../actions/hooks/useTaskActionPanel';
import { isTrackingRole, useMarkSeenOnOpen } from '../../hooks/useTaskTracking';
import type { TaskDetail } from '../../services/task-query.service';
import { buildJourney, cancelInfo, detailActions, taskHolder, viewerTurn } from './detail-logic';

/**
 * Dữ liệu + trạng thái dùng chung cho trang chi tiết và ngăn xem nhanh.
 * Quyền = `useTaskPermissions` V1; hộp thoại = `useTaskActionPanel` V1 (cùng một state modal).
 */
export function useTaskDetailModel(task: TaskDetail) {
  const { data: session } = useSession();
  const viewerId = session?.user?.id ?? '';
  const role = session?.user?.role?.name ?? '';
  const viewer = session?.user ? { id: viewerId, displayName: session.user.displayName ?? session.user.name ?? '' } : null;
  const permissions = useTaskPermissions(task, viewerId, role);
  const panel = useTaskActionPanel();
  const [editOpen, setEditOpen] = useState(false);

  // V2 (V1 đã có): Boss/Admin mở việc Hoàn thành → tính là đã xem
  useMarkSeenOnOpen(task, role);

  const journey = useMemo(() => buildJourney(task), [task]);
  const cancel = useMemo(() => cancelInfo(task), [task]);
  const holder = taskHolder(task, { viewerId, viewerRole: role, now: new Date(), allFailed: permissions.allFailed });
  const actions = detailActions(permissions);
  const turn = viewerTurn(permissions);

  return {
    task, viewer, viewerId, role, permissions, panel, actions, turn, journey, cancel, holder,
    isAdmin: role === 'ADMIN',
    canStar: isTrackingRole(role),
    /** V1: ô bình luận ẩn khi việc Đã xong/Đã hủy (CommentList canComment) */
    canComment: !['COMPLETED', 'CANCELLED'].includes(task.status),
    editOpen, setEditOpen,
  };
}

export type TaskDetailModel = ReturnType<typeof useTaskDetailModel>;

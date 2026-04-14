'use client';

import { DetailSidebarMeta } from './DetailSidebarMeta';
import { DetailTaskAttachments } from './DetailTaskAttachments';
import { DetailAssignees } from './DetailAssignees';
import type { TaskDetail } from '../../services/task-query.service';

interface Props { task: TaskDetail }

export function DetailSidebar({ task }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <DetailSidebarMeta task={task} />
      <DetailTaskAttachments attachments={task.attachments} />
      <DetailAssignees assignees={task.assignees} />
    </div>
  );
}

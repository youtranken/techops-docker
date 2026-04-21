-- Migration: Thêm FK cascades cho data integrity
-- Chạy: prisma db push  (hoặc apply thủ công nếu có production DB)
--
-- ⚠️  TRƯỚC KHI CHẠY: kiểm tra không có orphan rows:
--   SELECT COUNT(*) FROM "TaskAssignee" ta LEFT JOIN "Task" t ON t.id = ta."taskId" WHERE t.id IS NULL;
--   SELECT COUNT(*) FROM "AssigneeReport" ar LEFT JOIN "TaskAssignee" ta ON ta.id = ar."assigneeId" WHERE ta.id IS NULL;
--   SELECT COUNT(*) FROM "ReportAttachment" ra LEFT JOIN "AssigneeReport" ar ON ar.id = ra."reportId" WHERE ar.id IS NULL;

-- TaskAssignee.taskId → Cascade (xóa task → xóa assignees)
ALTER TABLE "TaskAssignee"
  DROP CONSTRAINT IF EXISTS "TaskAssignee_taskId_fkey",
  ADD CONSTRAINT "TaskAssignee_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- TaskAssignee.userId → Restrict (không xóa user có task)
ALTER TABLE "TaskAssignee"
  DROP CONSTRAINT IF EXISTS "TaskAssignee_userId_fkey",
  ADD CONSTRAINT "TaskAssignee_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AssigneeReport.assigneeId → Cascade
ALTER TABLE "AssigneeReport"
  DROP CONSTRAINT IF EXISTS "AssigneeReport_assigneeId_fkey",
  ADD CONSTRAINT "AssigneeReport_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "TaskAssignee"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ReportAttachment.reportId → Cascade
ALTER TABLE "ReportAttachment"
  DROP CONSTRAINT IF EXISTS "ReportAttachment_reportId_fkey",
  ADD CONSTRAINT "ReportAttachment_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "AssigneeReport"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- TaskAttachment.taskId → Cascade
ALTER TABLE "TaskAttachment"
  DROP CONSTRAINT IF EXISTS "TaskAttachment_taskId_fkey",
  ADD CONSTRAINT "TaskAttachment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment.taskId → Cascade
ALTER TABLE "Comment"
  DROP CONSTRAINT IF EXISTS "Comment_taskId_fkey",
  ADD CONSTRAINT "Comment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment.authorId → Restrict
ALTER TABLE "Comment"
  DROP CONSTRAINT IF EXISTS "Comment_authorId_fkey",
  ADD CONSTRAINT "Comment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ExtensionRequest.taskId → Cascade
ALTER TABLE "ExtensionRequest"
  DROP CONSTRAINT IF EXISTS "ExtensionRequest_taskId_fkey",
  ADD CONSTRAINT "ExtensionRequest_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ExtensionRequest.requesterId → Restrict
ALTER TABLE "ExtensionRequest"
  DROP CONSTRAINT IF EXISTS "ExtensionRequest_requesterId_fkey",
  ADD CONSTRAINT "ExtensionRequest_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- TaskAuditLog.taskId → SetNull (giữ audit history)
ALTER TABLE "TaskAuditLog"
  DROP CONSTRAINT IF EXISTS "TaskAuditLog_taskId_fkey",
  ADD CONSTRAINT "TaskAuditLog_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- TaskAuditLog.performedById → Restrict
ALTER TABLE "TaskAuditLog"
  DROP CONSTRAINT IF EXISTS "TaskAuditLog_performedById_fkey",
  ADD CONSTRAINT "TaskAuditLog_performedById_fkey"
    FOREIGN KEY ("performedById") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Notification.taskId → SetNull
ALTER TABLE "Notification"
  DROP CONSTRAINT IF EXISTS "Notification_taskId_fkey",
  ADD CONSTRAINT "Notification_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Notification.userId → Cascade (xóa user → xóa notifications)
ALTER TABLE "Notification"
  DROP CONSTRAINT IF EXISTS "Notification_userId_fkey",
  ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: Thêm lastOverdueReminderSentAt vào TaskAssignee
-- Mục đích: chống spam overdue reminder — 1 email/ngày/assignee/task
ALTER TABLE "TaskAssignee"
  ADD COLUMN IF NOT EXISTS "lastOverdueReminderSentAt" TIMESTAMP(3);

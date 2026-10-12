-- V2: ★ Task quan trọng (Boss/Admin, dùng chung) + Boss/Admin "đã xem" task hoàn thành (riêng từng người)
-- Chỉ THÊM MỚI, không sửa/xoá cột hay bảng hiện có.

-- 1) Cột đánh dấu quan trọng
ALTER TABLE "Task" ADD COLUMN "isImportant" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Task_isImportant_status_idx" ON "Task"("isImportant", "status");

-- 2) Bảng ghi nhận Boss/Admin đã xem task hoàn thành
CREATE TABLE "TaskCompletionView" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskCompletionView_pkey" PRIMARY KEY ("taskId", "userId")
);
CREATE INDEX "TaskCompletionView_userId_idx" ON "TaskCompletionView"("userId");
ALTER TABLE "TaskCompletionView" ADD CONSTRAINT "TaskCompletionView_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskCompletionView" ADD CONSTRAINT "TaskCompletionView_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Task đã hoàn thành TRƯỚC khi triển khai → coi như mọi Boss/Admin hiện có đã xem
--    (giữ hành vi cũ: vẫn ẩn; chỉ task hoàn thành từ bây giờ mới hiện "chưa xem")
INSERT INTO "TaskCompletionView" ("taskId", "userId", "seenAt")
-- Lưu ý: DB đặt TimeZone Asia/Ho_Chi_Minh nhưng Prisma ghi giờ UTC vào cột TIMESTAMP(3)
--         → phải dùng giờ UTC, nếu không seenAt bị lệch +7h so với completedAt.
SELECT t."id", u."id", (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
FROM "Task" t
CROSS JOIN "User" u
JOIN "Role" r ON r."id" = u."roleId"
WHERE t."status" = 'COMPLETED'
  AND r."name" IN ('BOSS', 'ADMIN')
ON CONFLICT DO NOTHING;

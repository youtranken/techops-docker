-- AssigneeReport: thêm minor version để phân biệt báo cáo bổ sung (V1.1) vs làm lại (V2.0)
-- Major (version) = tăng khi assignee Complete lại sau Boss reject review
-- Minor = tăng khi assignee bổ sung báo cáo (giữ major)

ALTER TABLE "AssigneeReport" ADD COLUMN "minorVersion" INTEGER NOT NULL DEFAULT 0;

-- Đổi unique constraint: từ (assigneeId, version) → (assigneeId, version, minorVersion)
ALTER TABLE "AssigneeReport" DROP CONSTRAINT IF EXISTS "AssigneeReport_assigneeId_version_key";
ALTER TABLE "AssigneeReport" ADD CONSTRAINT "AssigneeReport_assigneeId_version_minorVersion_key"
  UNIQUE ("assigneeId", "version", "minorVersion");

-- Sửa cho 20260424100000_add_report_minor_version:
-- DB Prod được tạo bằng `prisma db push` nên unique cũ (assigneeId, version) là UNIQUE INDEX,
-- không phải CONSTRAINT → lệnh DROP CONSTRAINT IF EXISTS ở migration trước bỏ qua nó.
-- Còn giữ index cũ thì báo cáo bổ sung (cùng version, minorVersion=1) bị lỗi trùng khoá.
-- Chỉ gỡ ràng buộc cũ; ràng buộc mới (assigneeId, version, minorVersion) đã có. Không đụng dữ liệu.
DROP INDEX IF EXISTS "AssigneeReport_assigneeId_version_key";

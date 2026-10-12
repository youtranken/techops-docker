/**
 * Quy tắc đính kèm file khi Tạo / Sửa công việc (client-side).
 * Server kiểm tra lại bằng TASK_ATTACHMENT_TYPES + magic bytes trong `@/lib/file-validation`.
 */

// Check theo extension — browser trên Windows đôi khi trả file.type rỗng cho file Office
export const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx', '.pptx'];
export const ACCEPTED_LABEL = 'PDF / JPG / PNG / Word / Excel / PowerPoint';
export const MAX_FILE_COUNT = 3;
export const MAX_SIZE_MB = 10;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

/**
 * @param selected     file người dùng vừa chọn
 * @param currentCount số file đang giữ (chưa bị xoá)
 * @returns thông báo lỗi, hoặc null nếu hợp lệ
 */
export function validateNewAttachments(selected: File[], currentCount: number): string | null {
  if (currentCount + selected.length > MAX_FILE_COUNT) {
    return `Tối đa ${MAX_FILE_COUNT} file đính kèm`;
  }
  for (const f of selected) {
    const dot = f.name.lastIndexOf('.');
    const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : '';
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `"${f.name}" không hợp lệ — chỉ chấp nhận ${ACCEPTED_LABEL}`;
    }
    if (f.size > MAX_SIZE) {
      return `"${f.name}" vượt quá ${MAX_SIZE_MB}MB`;
    }
  }
  return null;
}

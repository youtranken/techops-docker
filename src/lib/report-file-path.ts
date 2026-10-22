/**
 * File đính kèm báo cáo phải là file do /api/upload lưu cho CHÍNH task đó:
 *   `<taskId>/reports/<tên file>` (upload với taskId + subFolder='reports').
 * Chặn client gửi filePath của task khác → được cấp quyền tải file không thuộc mình qua /api/files.
 */
export function isOwnReportFilePath(taskId: string, filePath: string): boolean {
  if (!filePath || filePath.includes('..') || filePath.includes('\\') || filePath.includes('\0')) return false;
  const safeTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, '_'); // giống cách /api/upload đặt tên thư mục
  const prefix = `${safeTaskId}/reports/`;
  if (!filePath.startsWith(prefix)) return false;
  const name = filePath.slice(prefix.length);
  return name.length > 0 && !name.includes('/');
}

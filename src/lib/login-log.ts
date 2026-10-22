/**
 * Che chuỗi tên đăng nhập người dùng gõ khi username KHÔNG tồn tại.
 * Lý do: người dùng hay lỡ gõ mật khẩu vào ô tên đăng nhập → không được lưu/hiển thị nguyên văn
 * trong log (Boss/Admin xem được, còn ghi ra file archive). Đồng thời chặn chuỗi cực dài làm phình DB.
 */
export function maskAttemptedUsername(raw: unknown): string {
  if (typeof raw !== 'string') return '?';
  const value = raw.trim();
  if (!value) return '?';
  const head = Array.from(value.slice(0, 8)).slice(0, 2).join('');
  const len = value.length > 999 ? '999+' : String(value.length);
  return `${head}•••(${len} ký tự)`;
}

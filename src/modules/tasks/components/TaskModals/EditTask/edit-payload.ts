/**
 * ★ dùng chung giữa các Boss/Admin và có thể bị đổi ngay trên thẻ/trang chi tiết trong lúc form Sửa đang mở.
 * Chỉ gửi isImportant khi người dùng thực sự đổi ★ trong form — tránh ghi đè giá trị cũ lúc mở form.
 */
export function omitUnchangedImportant<T extends { isImportant?: boolean }>(values: T, initialIsImportant: boolean): T {
  if (values.isImportant === undefined || values.isImportant !== initialIsImportant) return values;
  const { isImportant: _unchanged, ...rest } = values;
  return rest as T;
}

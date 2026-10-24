/** GET JSON cho các bảng nhật ký: HTTP lỗi → ném lỗi (V1 nuốt lỗi, hiện "Không có dữ liệu"). */
export async function fetchLogJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

/** Lỗi 4xx (vd 403 tra cứu mã với nhân viên) không thử lại; lỗi khác thử lại tối đa 2 lần. */
export const logRetry = (count: number, err: Error) => !/^HTTP 4/.test(err.message) && count < 2;

/**
 * Chuyển dữ liệu đang nhập từ ngăn trượt sang trang đầy đủ (/tasks/new?from=panel).
 * Giữ trong bộ nhớ của trang (điều hướng phía client) nên tệp đã chọn cũng đi theo; tải lại trang thì mất (về form trống).
 */
import type { FileEntry } from '../../actions/components/modals/AttachmentField';
import type { TaskFormValues } from './form-logic';

export interface FormHandoff {
  values: TaskFormValues;
  base: TaskFormValues;
  draftId: string | null;
  files: FileEntry[];
}

let pending: FormHandoff | null = null;
export function setHandoff(h: FormHandoff) { pending = h; }
/** Đọc (không xoá — StrictMode gọi bộ khởi tạo state 2 lần); xoá bằng clearHandoff() trong effect. */
export function peekHandoff(): FormHandoff | null { return pending; }
export function clearHandoff() { pending = null; }

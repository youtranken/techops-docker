/**
 * Luật kiểm tra + câu "điều gì xảy ra tiếp theo" cho hộp thoại hành động V2 (A2-2).
 * GIỮ NGUYÊN luật V1 (ReasonModal, CompleteTaskModal, SupplementReportModal, RequestExtensionModal, TransferModal,
 * RejectReviewModal, CreateTask/attachment-rules, lifecycle.service complete(), reports route) — chỉ trả khoá i18n
 * để hiện lỗi inline thay cho chữ viết cứng. Test: `__tests__/action-dialog-rules.test.ts`.
 */
import {
  ACCEPTED_EXTENSIONS, MAX_FILE_COUNT, MAX_SIZE_MB,
} from '@/modules/tasks/components/CreateTask/attachment-rules';

export interface Msg { key: string; values?: Record<string, string | number> }

/** V1: báo cáo / bổ sung cần `content.length >= 10` (tính cả khoảng trắng). */
export const REPORT_MIN = 10;

/** ReasonModal V1: `required && !reason.trim()` → lỗi. Không có tối thiểu ký tự. */
export function reasonError(value: string, required: boolean): Msg | null {
  return required && !value.trim() ? { key: 'app.dlg.reasonErr' } : null;
}

/** CompleteTaskModal / SupplementReportModal V1: `content.length < 10` → không gửi. */
export function reportError(value: string): Msg | null {
  return value.length < REPORT_MIN ? { key: 'app.dlg.minErr', values: { n: value.length } } : null;
}

export function fileSizeLabel(bytes: number, locale: string = 'vi') {
  const s = bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  return locale === 'vi' ? s.replace('.', ',') : s;
}

/**
 * Cùng thứ tự kiểm như `validateNewAttachments` (V1): số lượng → từng tệp (đuôi → dung lượng), gặp lỗi đầu tiên thì dừng.
 */
export function attachmentError(selected: { name: string; size: number }[], have: number, locale: string = 'vi'): Msg | null {
  if (have + selected.length > MAX_FILE_COUNT) {
    return have >= MAX_FILE_COUNT
      ? { key: 'tf.att.full', values: { n: MAX_FILE_COUNT } }
      : { key: 'tf.att.max', values: { n: MAX_FILE_COUNT, k: selected.length, r: MAX_FILE_COUNT - have } };
  }
  for (const f of selected) {
    const dot = f.name.lastIndexOf('.');
    const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : '';
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return { key: 'tf.att.type', values: { f: f.name } };
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return { key: 'tf.att.size', values: { f: f.name, s: fileSizeLabel(f.size, locale), m: MAX_SIZE_MB } };
    }
  }
  return null;
}

/** RequestExtensionModal V1: `min` của ô ngày = hạn hiện tại + 1 ngày, tính bằng `toISOString().slice(0, 10)`. */
export function extensionMinDate(deadline: Date | string): string {
  const d = new Date(deadline);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** V1: phải chọn ngày (nút gửi khoá khi trống) và ngày ≥ `min`. Các luật còn lại (sau hôm nay, 5 đơn, 2 đơn chờ) do server kiểm. */
export function extensionDateError(value: string, deadline: Date | string): Msg | null {
  if (!value) return { key: 'tdx.dlg.ext.dateReq' };
  const min = extensionMinDate(deadline);
  return value < min ? { key: 'tdx.dlg.ext.dateErr', values: { d: min } } : null;
}

/** TransferModal V1: chọn người nhận + ghi chú không rỗng. */
export function transferErrors(to: string, notes: string): { to: Msg | null; notes: Msg | null } {
  return {
    to: to ? null : { key: 'app.dlg.tr.err' },
    notes: notes.trim() ? null : { key: 'app.dlg.tr.noteErr' },
  };
}

/** RejectReviewModal V1: ≥1 người, mỗi người được chọn có lý do không rỗng. */
export function reworkErrors(selected: string[], reasons: Record<string, string>) {
  const r: Record<string, Msg> = {};
  for (const id of selected) if (!(reasons[id] ?? '').trim()) r[id] = { key: 'app.dlg.reasonErr' };
  const pick = selected.length ? null : { key: 'app.dlg.rework.errPick' };
  return { pick, reasons: r, ok: !pick && Object.keys(r).length === 0 };
}

type AssigneeLite = { status: string; user: { id: string } };
const INACTIVE = ['TRANSFERRED', 'REJECTED', 'CANCELLED'];

/**
 * Sau khi gửi báo cáo xong (lifecycle.service complete() V1):
 * - còn người làm hiệu lực (≠ TRANSFERRED/REJECTED/CANCELLED) chưa COMPLETED → việc giữ nguyên, chờ họ;
 * - nếu không: mình đang REVISION_REQUIRED hoặc chế độ Phê duyệt → Chờ nghiệm thu; còn lại → Đã xong.
 */
export function reportNextStep({ workflowMode, assignees, viewerId }: {
  workflowMode?: string; assignees?: AssigneeLite[]; viewerId?: string;
}): Msg | null {
  if (!workflowMode || !assignees || !viewerId) return null;
  const me = assignees.find((a) => a.user.id === viewerId && ['IN_PROGRESS', 'REVISION_REQUIRED'].includes(a.status));
  if (!me) return null;
  const left = assignees.filter((a) => a !== me && !INACTIVE.includes(a.status) && a.status !== 'COMPLETED').length;
  if (left > 0) return { key: 'app.dlg.next.wait', values: { n: left } };
  return me.status === 'REVISION_REQUIRED' || workflowMode === 'NEED_APPROVAL'
    ? { key: 'app.dlg.next.approval' }
    : { key: 'app.dlg.next.direct' };
}

/** Phiên bản báo cáo sắp tạo: complete = major+1 .0 (lifecycle.service); supplement = giữ major, minor+1 (reports route). */
export function nextReportVersion(reports: { version: number; minorVersion: number | null }[], kind: 'complete' | 'supplement') {
  const last = [...reports].sort((a, b) => b.version - a.version || (b.minorVersion ?? 0) - (a.minorVersion ?? 0))[0];
  if (kind === 'complete') return `v${(last?.version ?? 0) + 1}.0`;
  return `v${last?.version ?? 1}.${(last?.minorVersion ?? 0) + 1}`;
}

/** Việc nhiều người làm: n người còn hiệu lực, x người đã nhận (acknowledge.service: mỗi người tự nhận phần mình). */
export function acceptProgress(assignees: { status: string }[]): { n: number; x: number } | null {
  const act = assignees.filter((a) => !INACTIVE.includes(a.status));
  if (act.length <= 1) return null;
  return { n: act.length, x: act.filter((a) => a.status !== 'PENDING').length };
}

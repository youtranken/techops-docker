/**
 * Logic thuần của Bảng Kanban V2 (A2-4a). Không phụ thuộc React → test được (`__tests__/board-logic.test.ts`).
 *
 * NGHIỆP VỤ GIỮ NGUYÊN V1:
 * - Kéo thả chỉ là LỐI TẮT mở hộp thoại của một hành động V1 sẵn có (A2-2), đúng 1 bước tiến, đúng vai trò.
 *   Quyền đọc từ cờ `useTaskPermissions` (cùng nguồn với menu ⋯ `quickMenuKeys`), cột đích theo service V1:
 *     Duyệt (approvePlan)          PENDING_APPROVAL    → WAITING_ACKNOWLEDGE
 *     Nhận việc (acknowledge)      WAITING_ACKNOWLEDGE → IN_PROGRESS
 *     Báo cáo hoàn thành (complete) IN_PROGRESS        → PENDING_REVIEW (Phê duyệt, hoặc người làm đang REVISION_REQUIRED)
 *                                                      → COMPLETED (Trực tiếp)  — việc chỉ đổi cột khi MỌI người làm đã xong
 *     Nghiệm thu (approveReview)   PENDING_REVIEW      → COMPLETED
 *   Không kéo lùi (Từ chối / Yêu cầu làm lại chỉ qua menu ⋯), không hủy, không sắp thứ tự (DB không có trường vị trí).
 * - Dữ liệu: mỗi cột = 1 lần gọi `GET /api/tasks` V1 với `status` của cột + đúng bộ lọc đang chọn (không thêm endpoint).
 */
import type { TaskListFilters, TaskListItem } from '../../services/task-query.service';
import type { TaskPermissions } from '../../actions/hooks/useTaskPermissions';

export type BoardCol = 'PENDING_APPROVAL' | 'WAITING_ACKNOWLEDGE' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED';
/** 5 cột quy trình (bỏ cột Nháp — V1 không có luồng tạo DRAFT). Đã hủy chỉ hiện khi bộ lọc gồm việc đã hủy. */
export const BOARD_FLOW: BoardCol[] = ['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED'];
const ALL_COLS: BoardCol[] = [...BOARD_FLOW, 'CANCELLED'];

/** Số thẻ tải mỗi cột lúc đầu; "Xem thêm" +20 tới trần MAX_PAGE_SIZE của API (100). */
export const COL_LIMIT = 20;
export const COL_LIMIT_MAX = 100;
export const nextColLimit = (n: number) => Math.min(COL_LIMIT_MAX, n + COL_LIMIT);

export type DropAction = 'approve-plan' | 'acknowledge' | 'complete' | 'approve-review';
export type BoardPerms = Pick<
  TaskPermissions, 'canApprovePlan' | 'canAcknowledge' | 'canComplete' | 'canApproveReview' | 'currentUserAssignee'
>;

export function columnOf(status: string): BoardCol | null {
  return (ALL_COLS as string[]).includes(status) ? (status as BoardCol) : null;
}

/** Bước tiến duy nhất người xem được kéo (null = thẻ không kéo được). */
export function forwardMove(task: TaskListItem, p: BoardPerms): { action: DropAction; to: BoardCol } | null {
  switch (columnOf(task.status)) {
    case 'PENDING_APPROVAL':
      return p.canApprovePlan ? { action: 'approve-plan', to: 'WAITING_ACKNOWLEDGE' } : null;
    case 'WAITING_ACKNOWLEDGE':
      return p.canAcknowledge ? { action: 'acknowledge', to: 'IN_PROGRESS' } : null;
    case 'IN_PROGRESS':
      // Nhận việc khi việc đã Đang làm (người mới được chuyển giao) không đổi cột → không kéo; dùng nút/menu.
      if (!p.canComplete) return null;
      return {
        action: 'complete',
        to: p.currentUserAssignee?.status === 'REVISION_REQUIRED' || task.workflowMode === 'NEED_APPROVAL'
          ? 'PENDING_REVIEW' : 'COMPLETED',
      };
    case 'PENDING_REVIEW':
      return p.canApproveReview ? { action: 'approve-review', to: 'COMPLETED' } : null;
    default:
      return null;
  }
}

/** Kéo thẻ từ cột `from` sang `to` → hành động V1 cần mở hộp thoại, hoặc null (thả không hợp lệ → thẻ về chỗ cũ). */
export function dropActionFor(task: TaskListItem, from: BoardCol, to: BoardCol, p: BoardPerms): DropAction | null {
  if (from !== columnOf(task.status)) return null;
  const m = forwardMove(task, p);
  return m && m.to === to ? m.action : null;
}

// ───────────────────────────── Dữ liệu cột ─────────────────────────────
/** Cột hiển thị theo tab/bộ lọc: tab Đã xong / Đã hủy → 1 cột; "Tất cả" → thêm Đã hủy; còn lại 5 cột quy trình. */
export function boardColumns(f: TaskListFilters): BoardCol[] {
  if (f.status === 'COMPLETED' || f.status === 'CANCELLED') return [f.status];
  if (!f.status && !f.hideCompleted) return ALL_COLS; // status=all (hoặc Mới xong) — giống danh sách: có cả đã hủy
  return BOARD_FLOW;
}

/**
 * Payload API cho 1 cột (giữ mọi điều kiện V1, thay status + trang 1 + giới hạn cột), hoặc null = cột không thuộc bộ lọc.
 * "Đang mở" (hideCompleted): V1 ẩn Hoàn thành/Đã hủy; riêng Boss/Admin vẫn thấy việc Hoàn thành CHƯA XEM (server) →
 * cột Đã xong của họ = status COMPLETED + unseenOnly; nhân viên thì cột Đã xong không tải.
 */
export function columnFilters(f: TaskListFilters, col: BoardCol, limit: number, tracking: boolean): TaskListFilters | null {
  if (f.status && f.status !== col) return null;
  const out: TaskListFilters = { ...f, status: col, hideCompleted: undefined, page: 1, limit };
  if (!f.status && f.hideCompleted && (col === 'COMPLETED' || col === 'CANCELLED')) {
    if (col === 'CANCELLED' || !tracking) return null;
    out.unseenOnly = true;
  }
  return out;
}

// ───────────────────────────── Chế độ xem ─────────────────────────────
export type TaskViewMode = 'list' | 'board';
/** Cookie nhớ chế độ xem (đọc ở server → không nháy Danh sách rồi mới sang Bảng). */
export const VIEW_COOKIE = 'techops_tasks_view';
const isMode = (v: unknown): v is TaskViewMode => v === 'list' || v === 'board';

/** URL `mode` thắng; không có → lựa chọn đã nhớ; giá trị lạ → Danh sách. */
export function resolveViewMode(urlMode: string | null, remembered: string | undefined): TaskViewMode {
  if (urlMode !== null) return isMode(urlMode) ? urlMode : 'list';
  return isMode(remembered) ? remembered : 'list';
}
export const modeUpdate = (mode: TaskViewMode) => ({ mode, page: undefined });

# Module: Tasks — Hướng dẫn cho AI Agent

## Mục đích

Module quản lý công việc trung tâm của hệ thống. Hỗ trợ hai chế độ workflow:
- **IMMEDIATE**: Giao việc trực tiếp, không cần phê duyệt
- **NEED_APPROVAL**: Cần BOSS/ADMIN duyệt kế hoạch trước khi thực hiện

## Cấu trúc

```
tasks/
  services/
    task.service.ts               # Facade: tập hợp create, update, delete, cancel
    task-create.service.ts        # Tạo task mới
    task-update.service.ts        # Cập nhật task
    task-delete.service.ts        # Xóa / hủy task
    task-query.service.ts         # Truy vấn danh sách, chi tiết
    task-workflow.service.ts      # Điều phối workflow transitions
    comment.service.ts            # Bình luận trên task
    extension.service.ts          # Gia hạn deadline
    workflow/                     # Chi tiết từng bước workflow
      _shared.ts                  # Helper dùng chung trong workflow
      acknowledge.service.ts      # Xác nhận nhận việc
      approval.service.ts         # Phê duyệt / từ chối kế hoạch
      assignment.service.ts       # Giao việc, chuyển việc
      lifecycle.service.ts        # Hoàn thành, hủy, review

  hooks/                          # 1 hook = 1 action (20 hooks)
    useTaskList.ts                # Danh sách task (filter, pagination)
    useTaskDetail.ts              # Chi tiết 1 task
    useCreateTask.ts              # Tạo task
    useUpdateTask.ts              # Cập nhật
    useDeleteTask.ts              # Xóa
    useCancelTask.ts              # Hủy
    useCompleteTask.ts            # Hoàn thành
    useAcknowledgeTask.ts         # Xác nhận nhận việc
    useApprovePlan.ts             # Duyệt kế hoạch
    useRejectPlan.ts              # Từ chối kế hoạch
    useApproveReview.ts           # Duyệt kết quả
    useRejectReview.ts            # Từ chối kết quả
    useRejectTask.ts              # Từ chối task
    useReassignTask.ts            # Chuyển giao task
    useTransferTask.ts            # Chuyển người thực hiện
    useExtensions.ts              # Gia hạn deadline
    useComments.ts                # Bình luận
    useAssignableUsers.ts         # Danh sách user có thể gán
    useTaskPermissions.ts         # Kiểm tra quyền với task
    useTaskListModals.ts          # State quản lý modals trong list

  components/
    TaskList/                     # Danh sách task
    TaskCard/                     # Card task (trong list)
    TaskDetail/                   # Chi tiết task V2 — DÙNG CHUNG cho trang /tasks/[id] (TaskDetailPage) và ngăn xem nhanh (TaskDetailDrawer)
    TaskModals/                   # Các modal (tạo, sửa, xóa, v.v.)
    ActionModals/                 # Modals cho các action workflow
    action-buttons/               # Nút hành động theo trạng thái
    Comments/                     # Bình luận

  config/
    taskActionMatrix.ts           # Ma trận: role + status → actions được phép
```

## Workflow Task (NEED_APPROVAL)

```
DRAFT
  → [BOSS duyệt] → WAITING_ACKNOWLEDGE
  → [BOSS từ chối] → DRAFT
WAITING_ACKNOWLEDGE
  → [Assignee xác nhận] → IN_PROGRESS
  → [Assignee từ chối] → DRAFT
IN_PROGRESS
  → [Assignee hoàn thành] → PENDING_REVIEW
PENDING_REVIEW
  → [BOSS duyệt] → COMPLETED
  → [BOSS từ chối] → IN_PROGRESS (revision)
```

## Workflow Task (IMMEDIATE)

```
IN_PROGRESS (tạo xong là IN_PROGRESS luôn)
  → [Assignee hoàn thành] → COMPLETED
```

## Quyền theo role

Xem `config/taskActionMatrix.ts` — đây là nguồn sự thật duy nhất cho phân quyền action.
**Không hardcode role check trong component** — luôn dùng `useTaskPermissions`.

## Điểm cần lưu ý khi sửa

- **`task-workflow.service.ts`**: điều phối tất cả transitions — đọc kỹ trước khi sửa
- **`workflow/_shared.ts`**: helper dùng chung, thay đổi ảnh hưởng toàn bộ workflow
- **`taskActionMatrix.ts`**: thêm role/action mới ở đây, không ở nơi khác
- Mỗi transition ghi `TaskAuditLog` — không bỏ bước này
- Task từ Helpdesk có field `hdId`, `hdCode`, `hdNguonNhap = 'helpdesk'`

## Khi thêm action workflow mới

1. Thêm enum value vào `TaskAction` trong `prisma/schema.prisma`
2. Thêm logic vào file phù hợp trong `workflow/`
3. Cập nhật `taskActionMatrix.ts`
4. Tạo hook `use[Action]Task.ts`
5. Tạo button/modal trong `action-buttons/` hoặc `ActionModals/`
6. Ghi `TaskAuditLog` trong service

## Task ID (taskCode)

- Field `taskCode` trên model `Task` (Prisma): `String? @unique`
- Format: `"YY-NNNN"` — 2 chữ số năm + 4 chữ số thứ tự, reset mỗi năm
  - Ví dụ: `26-0001`, `26-0042`, `27-0001` (năm 2027 reset lại)
- Auto-generate trong `task-create.service.ts` hàm `generateTaskCode(tx)`
- Hiển thị monospace (`font-mono`) trên card và quick view
- Task từ Helpdesk hiển thị riêng: `HD-{hdCode}` (không phải `taskCode`)

## Chi tiết công việc V2 (A2-1)

- `components/TaskDetail/`: `TaskDetailPage` (trang), `TaskDetailDrawer` (ngăn xem nhanh, thay TaskQuickView V1; nhận `ids` để bật ‹ ›), `TaskDetailLoader` (đang tải / 404 / 403 / lỗi mạng).
- Logic hiển thị thuần + test: `detail-logic.ts` — `buildJourney` (Hành trình), `taskHolder` ("Đang ở chỗ ai · bao lâu"), `detailActions`/`viewerTurn` (nút + "Đến lượt bạn…", CHỈ đọc cờ của `useTaskPermissions`), `drawerNav`, `assigneeNote`.
- Hành trình: Phê duyệt 5 bước (Chờ duyệt → Chờ nhận việc → Đang làm → Chờ nghiệm thu → Đã xong); Trực tiếp 3 bước (Chờ nhận việc → Đang làm → Đã xong) theo service V1. Ngày mỗi bước lấy từ `TaskAuditLog`.
- Nút bấm mở đúng hộp thoại V1 qua `TaskActionModals` (tách từ `TaskActionPanel`, chung state `useTaskActionPanel`).

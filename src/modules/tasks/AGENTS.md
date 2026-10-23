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
    useTaskListModals.ts          # State quản lý modals trong list (+ confirmState: Nhận việc/Duyệt/Nghiệm thu)

  components/
    TaskList/                     # Danh sách task V2 (A2-3) — bảng + bộ lọc + menu ⋯
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

## Hộp thoại hành động V2 (A2-2)

- Khung chung `@/shared/ui/ActionDialog` (+ `DialogNote`, `TaskSummary`) và `@/shared/ui/Field`. Mọi hộp trong `actions/components/modals/` dùng khung này, chữ qua `useTranslations` (`app.dlg.*`, `act.*`, `tf.att.*`, `tdx.dlg.*`).
- Luật kiểm tra = V1, gom ở `actions/components/modals/action-dialog-rules.ts` (`reasonError`, `reportError`, `attachmentError`, `extensionDateError`, `transferErrors`, `reworkErrors`) + câu "điều gì xảy ra tiếp theo" (`reportNextStep`, `nextReportVersion`, `acceptProgress`) theo service V1. Đổi luật ở đây = đổi nghiệp vụ → Phase B.
- `TaskActionModals` nhận thêm `task={{code,title,workflowMode}}` để hiện thẻ tóm tắt + ghi chú; payload mutation không đổi (test `modals/__tests__/action-modals.test.tsx`).
- Lý do Từ chối kế hoạch: chi tiết KHÔNG bắt buộc, danh sách (`TaskListModals`) bắt buộc — giữ nguyên lệch của V1.

## Danh sách công việc V2 (A2-3)

- `components/TaskList/`: `TaskListClient` (trang `/tasks`, gồm các mục con `?view=important` / `?view=unseen`), `TaskListGrid` (bảng `DataTable` `.v2-tasks`: Mã · Công việc · Ưu tiên · Người làm · Trạng thái · Hạn · ⋯; ≤680 dòng 3 tầng), `TaskListFilters` (bảng lọc + `FilterChips`), `DateFilter`, `TaskListModals`, `TaskViewSwitch` (chỗ cho nút Danh sách | Bảng của A2-4), `useTaskListState` (URL ↔ trạng thái ↔ payload API; A2-4 dùng lại).
- Logic thuần + test: `list-logic.ts` — `readListState`/`toApiFilters` (payload GIỐNG V1, đối chiếu `__tests__/v1-list.fixture.ts`), setter URL (`filterUpdate`, `pageUpdate`, `limitUpdate`, `sortUpdate`), tab (`tabsFor`, `activeTab`, `tabUpdate` → tham số V1 `view`/`status`), chip (`filterChips`, `chipRemoveUpdate`, `clearFiltersUpdate`), `headerSort` (cột Hạn/Trạng thái dùng sortField V1), `quickMenuKeys` (menu ⋯ = đúng tập hành động menu thẻ V1 theo `useTaskPermissions`, xếp theo preview), `latestPendingExtension`, `displayCode`.
- Menu ⋯: [Xem nhanh · Mở trang đầy đủ · Sao chép mã] · [hành động V1] · [Sửa · ★ (Boss/Admin)] · [Hủy]. Không có Giao lại (V1 thẻ không có — làm ở chi tiết). Nhận việc / Duyệt / Nghiệm thu mở hộp xác nhận A2-2 (`confirmState`), API không đổi.
- Thư mục `TaskCard/` (thẻ lưới V1) và `hooks/useTaskCardActions.ts` đã xoá ở A2-3.

## Bảng Kanban V2 (A2-4a)

- `/tasks?mode=board` (nút Danh sách | Bảng — `TaskViewSwitch`). URL `mode` thắng; không có thì theo cookie `techops_tasks_view` (đọc ở `app/(dashboard)/tasks/page.tsx` → không nháy). Dùng chung `useTaskListState` (tab, bộ lọc, tìm kiếm, sắp xếp), menu ⋯ (`RowMenu`/`quickMenuKeys`), `TaskListModals`, ngăn chi tiết.
- `components/TaskList/`: `TaskBoard` (cột + thẻ + kéo thả Pointer Events thuần, không thư viện), `useBoardData` (mỗi cột = 1 lần gọi `GET /api/tasks` V1 với `status` của cột; 20 thẻ/cột, "Xem thêm" +20 tới 100 = MAX_PAGE_SIZE, quá 100 → link sang Danh sách lọc theo trạng thái), `board-logic.ts` (+ test `__tests__/board-logic.test.ts`).
- `board-logic.ts`: `forwardMove`/`dropActionFor` (kéo cột A → B = hành động V1, chỉ đọc cờ `useTaskPermissions`, cột đích theo service V1), `boardColumns`/`columnFilters` (cột theo tab/bộ lọc; tab Đang mở: nhân viên không tải cột Đã xong, Boss/Admin cột Đã xong = Hoàn thành chưa xem như danh sách V1), `resolveViewMode`/`modeUpdate`.
- Luật kéo thả (đã chốt): chỉ tiến 1 bước, đúng vai trò; thả → mở hộp thoại A2-2 (không gọi API); Đóng/hủy → thẻ về chỗ cũ (`pending` trong `TaskListClient` giữ bản sao thẻ ở cột đích tới khi hộp đóng + bảng tải lại). Không kéo lùi/hủy/sắp thứ tự; không có cột Nháp. Tắt kéo khi ≤680px hoặc không có chuột chính xác → nút hành động trên thẻ + menu ⋯ (cũng là lối bàn phím).
- Ánh xạ: Chờ duyệt→Chờ nhận việc = Duyệt (Boss/Admin) · Chờ nhận việc→Đang làm = Nhận việc (người làm PENDING) · Đang làm→Chờ nghiệm thu (Phê duyệt, hoặc người làm đang REVISION_REQUIRED) / →Đã xong (Trực tiếp) = Báo cáo hoàn thành (người làm) · Chờ nghiệm thu→Đã xong = Nghiệm thu (Boss/Admin). Nhiều người làm: việc chỉ đổi cột khi mọi người xong (service V1).
- E2E `e2e/task-board-v2.spec.ts`.

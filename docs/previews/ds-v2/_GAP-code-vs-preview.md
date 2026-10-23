# GAP — Code thật TechOps V1 ↔ Preview giao diện V2 (ds-v2)

> Ngày: 22/10/2026 · Chế độ: **chỉ đọc**, không sửa code hay preview.
> Nguồn code: `src/**`, `prisma/schema.prisma`, `prisma/seed.ts`, `src/modules/**/AGENTS.md`, `graphify-out/GRAPH_REPORT.md` (235 community).
> Nguồn preview: `docs/previews/ds-v2/*.html`, `app.js` (`App.task.actions`, `App.act`), `copy.js`, `data.js`, `task-form.js`, `pp-data.js`, `reports-data.js`.
> **Lưu ý:** trong lúc audit, preview vẫn đang được sửa song song (task-form tách ra `task-form.js`, permissions.html thêm vai trò "Quản lý"/MANAGER, danh sách thêm "Nháp"). Bảng dưới là ảnh chụp lúc ~15:20 ngày 22/10/2026.

Ký hiệu cột **Preview**:
- **CÓ**: preview thể hiện đúng hoặc gần đúng.
- **MỘT PHẦN**: có nhưng thiếu trạng thái hoặc điều kiện.
- **THIẾU**: code có, preview không có.
- **TỰ THÊM**: preview có, code chưa có. Đây là tính năng mới cho V2; cần backend nếu giữ.
- **LỆCH**: cả hai đều có nhưng nhãn, điều kiện hoặc con số khác nhau.

---

## 1. Tóm tắt

1. **Vai trò.** Code có **3 vai trò**: `ADMIN` (Quản trị viên), `BOSS` (nhãn trong DB là **"Quản lý"**), `EMPLOYEE` (Nhân viên). Đây là **bảng `Role`** chứ không phải Prisma enum, và tên vai trò được viết cứng ở khoảng 60 chỗ.
   - Preview chỉ có **2 vai trò** `boss|emp` (`app.js:37-41`). Trong đó "boss" gộp cả Trưởng phòng lẫn Admin.
   - Hệ quả: mọi quyền **chỉ Admin mới có** không thể hiện được: Khôi phục, nút Giao lại, Bảo mật/SMTP/Chung, tạo user, reset Helpdesk, quyền riêng.
   - Riêng `permissions.html` vừa thêm cột MANAGER "Quản lý" dạng "vai trò dự kiến". Trong khi đó chỗ khác của preview (`pp.role.BOSS`) vẫn gọi BOSS là "Quản lý" → **trùng tên**.
2. **Bỏ sót lớn nhất về nghiệp vụ.** Không có **"Giao lại khi mọi người từ chối"** (`allFailed` + `reassign`): không có trạng thái, không có banner, không có hộp chọn người mới. Thông báo `ALL_FAILED` thì có.
   - Boss/Admin **tự giao việc cho mình** vẫn phải nhận việc và báo cáo như người làm. Preview không cho boss làm các thao tác này.
3. **Danh sách công việc thiếu hạ tầng thật:** phân trang và cỡ trang, lọc Loại, lọc Nguồn (TechOps/Helpdesk), lọc Thời gian (preset + từ–đến), xem việc **Đã hủy**, nút **"Đánh dấu đã xem tất cả"**.
   - Code **không có** bulk action trên danh sách công việc. Bulk chỉ có ở Nhân sự và Helpdesk, preview cũng vậy.
4. **Hộp "Báo cáo xong / Bổ sung"** thiếu 3 thứ: **mẫu báo cáo hoàn thành** (lọc theo loại việc), **dán ảnh**, và luật tệp (3 tệp, 10 MB, chỉ PDF/ảnh/Office).
5. **Phân quyền thật ≠ cái preview vẽ.**
   - Code có "quyền công việc theo trạng thái" 3 chiều (`RoleStatusAction` + `UserStatusAction`, sửa ở HR → Quyền riêng). Tuy nhiên `requirePermission()` **không được API nào gọi**, nên quyền riêng **không có hiệu lực**.
   - Quyền thật nằm ở 2 chỗ: `taskActionMatrix.ts` (UI) và các kiểm tra `role.name` trong service.
   - Quyền menu chỉ đặt **theo từng người**, không có "theo vai trò". Ma trận "Theo vai trò" của preview là tính năng mới.
6. **Preview tự thêm khá nhiều tính năng:** Bảng Kanban kéo thả, Nháp, trang Thông báo đầy đủ, chuyển ngôn ngữ EN (i18n đang hoãn), xuất Excel danh sách công việc, xuất Excel nhật ký, khóa bình luận khi việc đã xong, trạng thái gia hạn "Đã rút", ma trận quyền theo vai trò.
7. **Nhiều chỗ lệch nhỏ** về nhãn, con số và điều kiện hiện nút:
   - Mã việc: `26-0001` ↔ `CV-1019`.
   - Nhắc hạn: 3 ngày ↔ 24 giờ.
   - Lý do: preview bắt ≥10 ký tự, code chỉ cần không rỗng (từ chối kế hoạch còn không bắt buộc).
   - Xin gia hạn: preview cho cả người tạo và nhiều trạng thái.
   - Hủy và chuyển giao: điều kiện khác code.
   - Người nhận digest mặc định: code chỉ Boss, preview ghi "Trưởng phòng và Admin".

---

## 2. Bảng đối chiếu theo nhóm

### 2.1 Route trang

| Trang code | Nơi trong code | Preview | Ghi chú |
|---|---|---|---|
| `/login` | `app/(auth)/login` | CÓ `login.html` | Có các kịch bản sai thông tin, khóa tài khoản, rate limit, phiên hết hạn |
| `/change-password` (đổi lần đầu) | `app/(auth)/change-password`, `middleware.ts:93` mustChangePassword | CÓ `password.html` (mode first) | |
| `/reset-password` | `app/(auth)/reset-password` | CÓ `password.html` (mode reset) | Link 15 phút |
| `/verify-email` | `app/(auth)/verify-email` | CÓ `password.html` (mode verify) | |
| `/` Dashboard | `app/(dashboard)/page.tsx`, community "Dashboard Stats Queries" | CÓ `dashboard.html` | Nội dung theo vai trò |
| `/tasks` | `modules/tasks/components/TaskList/*` | MỘT PHẦN `tasks-list.html` | Thiếu phân trang và bộ lọc (xem 2.7) |
| (không có) | — | TỰ THÊM `tasks-board.html` | Bảng Kanban + kéo thả có kiểm soát |
| `/tasks/[id]` | `TaskDetail/*` | CÓ `task.html` | |
| Sheet Tạo/Sửa | `CreateTask/*`, `TaskModals/EditTask*` | CÓ `task-form.html` + `task-form.js` | V2 thành trang riêng, có thêm "mở dạng trang" |
| Xem nhanh (TaskQuickViewSheet) | `TaskQuickView/*` | CÓ (ngăn trượt `#dr` trong `app.js`) | |
| `/helpdesk` | `modules/helpdesk/sections/*` | CÓ `helpdesk.html` | |
| `/analytics` | `app/(dashboard)/analytics/page.tsx` | CÓ `reports.html` (tab Tổng quan) | |
| `/analytics/task-list` | `analytics/task-list/page.tsx` | CÓ `reports-tasks.html` | |
| `/analytics/research` (Quá hạn + Workload) | `analytics/research/page.tsx` | THIẾU | **Route mồ côi**: không có link trong sidebar (`AnalyticsMenu.tsx:13-14`) |
| `/hr/users` | `modules/hr/users/*` | CÓ `people.html` | |
| `/hr/permissions/{logs,users,analytics,helpdesk,settings}` | `hr/permissions/*`, `PermissionsMatrixSection.tsx` | LỆCH `permissions.html` | Code đặt quyền menu theo từng người. Preview có thêm "Theo vai trò" |
| `/hr/users/[id]/permissions` (quyền công việc 3D) | `api/hr/users/[id]/permissions` | CÓ (permissions.html → Theo người dùng → Quyền công việc) | **Không có hiệu lực ở API** (xem mục 5) |
| `/logs/task-activity`, `/logs/user-activity`, `/logs/task-reference` | `modules/logs/*`, `LogsNav.tsx:33` | CÓ `logs.html` (3 tab) | |
| `/settings/*` (priorities, task-types, completion-templates, profile, notifications, digest, overdue-reminder, security, smtp) | `app/(dashboard)/settings/*`, `sidebar/config.ts:73-104` | CÓ `settings.html` + `profile.html` | Hồ sơ tách thành trang riêng |
| `/settings/general` (múi giờ) | `settings/general/page.tsx`, API chỉ ADMIN | CÓ (có ghi chú "route mồ côi") | Code không có link tới trang này |
| (không có trang riêng; chỉ có chuông thông báo) | `NotificationBell/Dropdown` | TỰ THÊM `notifications.html` | API `/api/notifications` đã có phân trang |
| Trang lỗi 403/404/500/offline | `error`, `not-found` | CÓ `errors.html` | |

### 2.2 API (nhóm chính)

| API | Preview | Ghi chú |
|---|---|---|
| `tasks/[id]/{acknowledge, complete, approve-plan, reject-plan, approve-review, reject-review, reject-task, transfer, cancel, restore, reports(supplement), extension, extension/[extId]}` | CÓ (14 hành động trong `App.act`) | |
| `tasks/[id]/reassign` | **THIẾU** | Không có trong `App.act` |
| `tasks/[id]/important`, `tasks/[id]/seen` | CÓ | ★ và Mới xong |
| `tasks/seen-all` | **THIẾU** | Nút "Đánh dấu đã xem tất cả" (`TaskListClient.tsx:169-179`) |
| `tasks/[id]/completion-templates` | **THIẾU** | Mẫu trong hộp Báo cáo |
| `tasks/[id]/comments` (+ `[cid]` PATCH/DELETE) | CÓ | |
| `tasks/counters`, `tasks/stats` | CÓ (đếm trên nav) | |
| `tasks/assignable-users` | LỆCH | Code trả EMPLOYEE+BOSS (`assignable-users/route.ts:17`). Preview bỏ Boss khỏi danh sách chuyển giao |
| `analytics/*` (kpi, funnel, trends, monthly-overview, performance, workload, overdue, task-types, drilldown, export, export/pdf, task-list, task-list/export, task-list/employees) | CÓ, trừ `workload` và `overdue` (thuộc trang research) | |
| `hr/users` (+bulk-action, export CSV, send-reset-link, role-actions, permissions), `hr/sidebar-permissions`, `hr/roles`, `hr/status-permissions/check` | CÓ | |
| `integrations/helpdesk/{sync, sync/retry, cron-config, push-to-tasks, unassigned, unassigned/[id], reset, reset/request-otp}` | CÓ, trừ `sync/retry` (MỘT PHẦN) | Có báo đồng bộ lỗi, chưa thấy nút "Thử lại tạo việc lỗi" |
| `logs/{tasks, users, users/list, task-reference}` | CÓ | |
| `settings/*` (priorities, task-types, completion-templates, notification-prefs, digest-config + send-test, overdue-reminder-config, email-templates, smtp + test, security + idle-timeout, general, profile + change-password) | CÓ | |
| `upload`, `upload/avatar`, `files`, `files/avatars/[filename]` | CÓ (giả lập) | |
| `health` | Không áp dụng | Chỉ dùng cho giám sát, không có UI |
| `auth/password-policy`, `auth/logout-log`, `dev/test-password-expiry` | Không áp dụng | |

### 2.3 Hành động công việc (`App.act` ↔ code)

| Hành động | Code | Preview | Ghi chú |
|---|---|---|---|
| Duyệt kế hoạch | `approval.service.ts:24` (BOSS/ADMIN) | CÓ `approve` | |
| Từ chối kế hoạch → CANCELLED | `approval.service.ts:76-98` | LỆCH `reject` | Code: lý do **không bắt buộc** (`TaskActionPanel` ReasonModal không có `required`). Preview: bắt buộc ≥10 ký tự |
| Nhận việc | `acknowledge.service.ts` | CÓ `accept` | Có ghi chú khi nhiều người cùng nhận |
| Từ chối nhận | `assignment.service.ts:126-222` | LỆCH `decline` | Code: lý do bắt buộc, không giới hạn số ký tự. Nếu việc được chuyển giao tới thì trả về người chuyển. Preview: bắt buộc ≥10 ký tự; **không thể hiện việc "trả về người chuyển giao"** |
| Báo cáo xong | `lifecycle.service.ts:25-196` | MỘT PHẦN `report` | Thiếu **mẫu hoàn thành**, **dán ảnh**, giới hạn 3 tệp / 10 MB / định dạng (`attachment-rules.ts`) |
| Bổ sung báo cáo | `useTaskPermissions.ts:121-125` (chỉ Phê duyệt, IN_PROGRESS/PENDING_REVIEW, người làm đã COMPLETED) | LỆCH `supplement` | Preview cho cả quy trình Trực tiếp |
| Nghiệm thu | `approval.service.ts:146` | CÓ `review` | |
| Yêu cầu làm lại (theo từng người) | `approval.service.ts:199-265`, `RejectReviewModal` | CÓ `rework` | Khớp: chọn người và nhập lý do riêng cho từng người |
| Chuyển giao | `assignment.service.ts:25-122` | CÓ `transfer` | Có chặn vòng lặp và chặn khi Bắt buộc. Preview bỏ Boss khỏi danh sách |
| **Giao lại (allFailed)** | `assignment.service.ts:225-302`, `ReassignModal`, `TaskActionButtons.tsx:57-59` | **THIẾU** | Chọn **nhiều** người. Việc về WAITING_ACKNOWLEDGE, `allFailed=false` |
| Hủy | `lifecycle.service.ts:198-283` | LỆCH `cancel` | Xem mục 4 |
| Khôi phục | `restore.service.ts:15-17` (**chỉ ADMIN**) | LỆCH `restore` | Preview cho boss. Code còn **giao lại toàn bộ người làm về "Chờ nhận"**; preview không nói điều này |
| Xin gia hạn | `extension.service.ts:32-68` | LỆCH `extend` | Xem mục 4 |
| Duyệt / từ chối gia hạn | `extension.service.ts:126,186` (BOSS/ADMIN) | CÓ `extOk/extNo` | |
| Rút đơn gia hạn | `extension.service.ts:225-250` | LỆCH `extWd` | Code ghi `REJECTED` + "Withdrawn by requester". Preview có trạng thái riêng `WITHDRAWN` |
| Sửa | `task-update.service.ts` | CÓ (`Task.canEdit`, task-form) | Khớp khá sát, kể cả luật đổi quy trình (`tf.mode.lock.*`) |
| Bật/tắt Bắt buộc | `task-update.service.ts:38-47` (chỉ BOSS/ADMIN, chỉ Phê duyệt) | CÓ (task-form `tf.force`) | |
| ★ Quan trọng | `task-tracking.service.ts`, `important` route | CÓ | |
| Xóa công việc | Chỉ có quyền DELETE cho ADMIN trong seed. **Không có API** | Không có (khớp) | |

### 2.4 Trạng thái và enum

| Enum (schema) | Giá trị code | Preview | Ghi chú |
|---|---|---|---|
| `TaskStatus` | DRAFT, PENDING_APPROVAL, WAITING_ACKNOWLEDGE, IN_PROGRESS, PENDING_REVIEW, COMPLETED, CANCELLED | CÓ đủ 7 | Nhãn lệch, xem 2.4.1 |
| `WorkflowMode` | IMMEDIATE, NEED_APPROVAL | CÓ (Trực tiếp / Phê duyệt) | HR preview gọi là "Giao trực tiếp / Cần duyệt", không thống nhất |
| `AssigneeStatus` | PENDING, ACKNOWLEDGED (không dùng), IN_PROGRESS, COMPLETED, REJECTED, TRANSFERRED, REVISION_REQUIRED | LỆCH: PENDING, ACCEPTED, IN_PROGRESS, REPORTED, REWORK, DECLINED, TRANSFERRED | Preview tách "Đã nhận" và "Đang làm"; code nhận việc là vào thẳng IN_PROGRESS |
| `ExtensionStatus` | PENDING, APPROVED, REJECTED | LỆCH: thêm WITHDRAWN | |
| `NotificationType` (14) | xem 2.10 | CÓ đủ 14 | |
| `TaskAction` (audit, 21) | `schema.prisma:525` | CÓ (logs `lg.a.*`, lịch sử `td.h.*`) | Preview thêm `COMPLETED_PART` (báo cáo phần mình) |
| `UserAction` (22) | `schema.prisma:549` | CÓ (logs tab Người dùng) | `REVOKE_SESSION` có trong enum nhưng **không có tính năng** |
| `OverrideType` | GRANT / REVOKE | CÓ ("Cho phép / Thu hồi") | |

#### 2.4.1 Nhãn trạng thái lệch

| Status | Code: badge (`TaskStatusBadge.tsx:5-11`) | Code: `STATUS_LABELS` (`lib/constants.ts:24-31`) | Preview `st.*` |
|---|---|---|---|
| DRAFT | Nháp | Draft | Nháp |
| PENDING_APPROVAL | Chờ Duyệt | Chờ duyệt | Chờ duyệt |
| WAITING_ACKNOWLEDGE | Chờ Tiếp Nhận | Chờ tiếp nhận | **Chờ nhận việc** |
| IN_PROGRESS | Đang Làm | Đang thực hiện | Đang làm |
| PENDING_REVIEW | Chờ Review | Chờ Review | **Chờ nghiệm thu** |
| COMPLETED | Hoàn Thành | Hoàn thành | **Đã xong** |
| CANCELLED | Đã Hủy | Đã hủy | Đã hủy |

Tên nút cũng đổi: Tiếp nhận → **Nhận việc**; Hoàn thành → **Báo cáo xong**; Duyệt KQ hoàn thành → **Nghiệm thu**; Từ chối công việc → **Từ chối**.

Riêng Helpdesk sync map chuỗi `'Hoàn thành'` từ hệ thống ngoài. Đổi nhãn UI không ảnh hưởng tới phần này, nhưng **không được đổi giá trị đó**.

### 2.5 Cron, email, digest

| Tính năng | Code | Preview | Ghi chú |
|---|---|---|---|
| Nhắc hạn (DEADLINE_REMINDER) | `lib/cron/deadline-reminder.ts:15-28`: 08:00 hằng ngày, **trước 3 ngày** (env), **mặc định tắt** (`CRON_DEADLINE_REMINDER_ENABLED`); gửi cả Boss/Admin | LỆCH | Preview ghi "24 giờ trước khi đến hạn" (`set.nt.DEADLINE_REMINDER.d`, `nt.m.DEADLINE_REMINDER`). Không có chỗ cấu hình trên UI |
| Nhắc quá hạn | `overdue-reminder.ts` (mỗi phút kiểm tra lịch); bảng `OverdueReminderConfig`; email riêng OVERDUE / PENDING_ACK / UPCOMING | CÓ `set.ov.*`, `set.oi.*` | |
| Digest định kỳ | `digest.ts` (ngày trong tuần / thứ Hai / cuối tháng); 5 loại nội dung; gửi thử | CÓ `set.dg.*`, `set.dc.*` | Lệch người nhận mặc định: code gửi **chỉ BOSS** (`digest.ts:55-63`). Preview ghi "tất cả Trưởng phòng và Admin" |
| Hết hạn mật khẩu | `password-expiry.ts` 09:00, nhắc trước 3 ngày | CÓ (`set.sec.expH`) | |
| Đồng bộ Helpdesk tự động | `helpdesk-sync.ts` (tối đa 2 khung giờ) | CÓ `hd.cron.*` | |
| Lưu trữ log | `log-archive.ts:112-152`: ngày 1 hằng tháng lúc 01:00, ghi `logs.xlsx` vào `LOG_ARCHIVE_PATH`, xóa log quá 90 ngày; không có env thì tắt | CÓ (`lg.sub`) | Không có UI tải file lưu trữ |
| Email thông báo | `_shared.ts:111-155`: Admin không nhận email việc; công tắc chính lấy theo prefs của Admin; loại email = hợp prefs Admin+Boss | CÓ `set.nt.*` | |
| Mẫu email | `EmailTemplatesSection` (nằm trong trang SMTP, API cho ADMIN/BOSS) | CÓ `set.em.*` (mục riêng) | |
| SMTP + gửi thử | `settings/smtp` (ADMIN) | CÓ `set.sm.*` | |

### 2.6 Bulk action và export

| Tính năng | Code | Preview | Ghi chú |
|---|---|---|---|
| Bulk trên danh sách công việc | **Không có** | Không có | Khớp. Nếu muốn có ở V2 thì là tính năng mới |
| Bulk người dùng (khóa, mở, đổi vai trò, bắt đổi mật khẩu) | `api/hr/users/bulk-action/route.ts:6-10` (ADMIN/BOSS) | CÓ `pp.bulk.*` | |
| Bulk Helpdesk (gán người, tạo việc) | `BulkAssignModal`, `push-to-tasks` | CÓ `hd.bulk.*` | |
| Xuất PDF báo cáo | `api/analytics/export/pdf`, `pdf.service.ts` | CÓ (`rp.exportPdf`) | |
| Xuất Excel báo cáo, danh sách việc theo kỳ | `api/analytics/export`, `task-list/export` | CÓ | |
| Xuất Excel ticket Helpdesk | `unassigned/export-xlsx.handler.ts` | CÓ | |
| Xuất CSV người dùng | `api/hr/users/export` | CÓ (`pp.t.export`) | |
| Xuất Excel danh sách công việc | **Không có** | TỰ THÊM (nút `data-soon`, `tasks-list.html:91`) | |
| Xuất Excel nhật ký | **Không có UI** (chỉ có cron lưu trữ) | TỰ THÊM (`data-soon`, `logs.html:541`) | |

### 2.7 Filter, sort, phân trang (danh sách công việc)

| Tính năng | Code | Preview | Ghi chú |
|---|---|---|---|
| Tìm theo tiêu đề | `TaskListFilters.tsx:51` | CÓ | Preview tìm cả mã và mã HD |
| Trạng thái (Chưa hoàn thành / Tất cả / từng trạng thái, gồm **Đã hủy**) | `TaskListFilters.tsx:64-70` | MỘT PHẦN | Preview dùng tab Cần tôi xử lý / Đang mở / Quan trọng / Mới xong / Đã xong. **Không có cách xem việc Đã hủy**, nên không tới được nút Khôi phục |
| Ưu tiên | `:76-80` | CÓ (cột sắp xếp) | Nút "Lọc" chưa có bảng lọc thật |
| **Loại công việc** | `:84-88` | THIẾU | |
| **Nguồn TechOps / Helpdesk** | `:92-97`, `api/tasks/route.ts:15` | THIẾU | |
| **Thời gian** (Hôm nay / 7 ngày / 30 ngày / Quá hạn + từ–đến) | `DateFilter.tsx:20-40` | THIẾU | |
| Người làm | API có `assigneeId`; UI V1 không có | TỰ THÊM (cột + sắp xếp) | |
| Sắp xếp mặc định "thông minh": chưa xem → ★ → ưu tiên → mới nhất | `task-query.service.ts:146-178` | MỘT PHẦN | Preview có sắp xếp theo cột (ưu tiên / trạng thái / hạn); thứ tự mặc định chưa mô tả |
| Sắp xếp theo createdAt / scheduleEnd / title / status | `api/tasks/route.ts:27` | MỘT PHẦN | Preview không sắp theo tiêu đề hay ngày tạo |
| **Phân trang + cỡ trang 10/20/50/100** | `TaskListPagination.tsx:7` | THIẾU | Preview hiện toàn bộ một lần |
| View ★ Quan trọng / Hoàn thành chưa xem (Boss/Admin) | `TaskListClient.tsx:43-47`, `TaskTrackingMenu.tsx` | CÓ | |
| **Đánh dấu đã xem tất cả** | `TaskListClient.tsx:169-179` | THIẾU | |

### 2.8 Comment, mention, attachment, báo cáo có phiên bản

| Tính năng | Code | Preview | Ghi chú |
|---|---|---|---|
| Bình luận + @nhắc tên (tối đa 20 người, 5000 ký tự) | `comment.service.ts:92-155` | CÓ (gợi ý `@`) | Code gửi thông báo COMMENT_ADDED **chỉ tới người được nhắc** |
| Sửa bình luận (chỉ tác giả) / xóa (tác giả hoặc **ADMIN**) | `comment.service.ts:179,215-217` | MỘT PHẦN | Preview chỉ cho tác giả; thiếu quyền xóa của Admin |
| Khóa bình luận khi việc đã Xong hoặc Hủy | Không có | TỰ THÊM (`td.cm.lockDone`) | |
| Đính kèm khi tạo/sửa (3 tệp, 10 MB, PDF/JPG/PNG/Office, có kiểm magic bytes) | `attachment-rules.ts`, `lib/file-validation.ts` | CÓ (`tf.att.*`, `MAXF=3`, `MAXMB=10`) | |
| Dán ảnh (Ctrl+V) khi tạo việc | `usePasteImage.ts`, `PasteImageModal` | CÓ (`tf.paste.*`) | |
| Dán ảnh trong hộp Báo cáo / Bổ sung | `CompleteTaskModal.tsx:36,201`, `SupplementReportModal` | THIẾU | |
| Luật tệp trong hộp Báo cáo / Bổ sung | `lifecycle.service.ts:53-70` | THIẾU (`attField` không giới hạn) | |
| **Mẫu báo cáo hoàn thành** (theo loại việc) | `CompleteTaskModal.tsx:64-68,127-145`, `ReportTemplate` | THIẾU trong hộp. Phần quản lý mẫu ở Cài đặt thì CÓ | |
| Báo cáo có phiên bản (version.minor) + popup xem từng phiên bản | `AssigneeReport.version/minorVersion`, `ReportDialog.tsx` | CÓ (`App.reportPopup`, v1.0/v1.1) | |
| Nút "+ Thêm tệp" ở chi tiết việc | `DetailTaskAttachments.tsx:32-37` (nút không làm gì, lỗi V1) | CÓ (`td.addFile`) | Cần backend nếu muốn giữ |

### 2.9 Extension, transfer, reassign, force, restore, DRAFT, task reference

| Tính năng | Code | Preview | Ghi chú |
|---|---|---|---|
| Gia hạn: tối đa 2 đơn chờ, 5 đơn mỗi việc, ngày mới > hạn cũ và > hôm nay | `extension.service.ts:47-68` | CÓ (`td.ext.rules`, `App.act extend`) | |
| Đổi hạn thì tự từ chối các đơn đang chờ | `task-update.service.ts:168-180` | CÓ (`tf.due.ext`) | |
| Hoàn thành hoặc hủy thì tự từ chối các đơn đang chờ | `lifecycle.service.ts:154,249` | CÓ (`autoRejectExt`) | |
| Chuyển giao: cấm vòng lặp, cấm khi Bắt buộc, chỉ khi IN_PROGRESS | `assignment.service.ts:32-65` | CÓ | |
| Từ chối nhận việc được chuyển giao thì trả về người chuyển | `assignment.service.ts:148-187` | THIẾU (không có hiển thị hay lịch sử) | |
| **allFailed**: mọi người từ chối hoặc chuyển đi → báo người tạo; người tạo được Hủy hoặc Giao lại | `_shared.ts:172-194`, `taskActionMatrix.ts:186-190` | **THIẾU** | Không có dữ liệu mẫu, banner hay nút |
| Bắt buộc (Force): chỉ ở Phê duyệt; khóa Từ chối và Chuyển giao; nhân viên không hủy được | `taskActionMatrix.ts:156-166`, `task-update.service.ts:38-47` | CÓ | |
| Khôi phục việc đã hủy về trạng thái trước khi hủy | `restore.service.ts` (ADMIN, cần `statusBeforeCancel`) | LỆCH (preview cho boss) | |
| DRAFT | Có trong enum, **không có luồng tạo** (`task-create.service.ts:60-84` không bao giờ trả DRAFT); bị lọc khỏi danh sách (`TaskListFilters.tsx:13`) | TỰ THÊM (Nháp của tôi, Lưu nháp: `dr.*`) | Cần backend: lưu nháp, quyền xem, dọn nháp |
| Tra cứu mã (task reference) | `/logs/task-reference`, API ADMIN/BOSS | CÓ (`lg.tab.ref`) | |
| Định dạng mã việc | `task-create.service.ts:47-57` → `YY-NNNN` (vd `26-0001`) | LỆCH (`CV-1019`) | Mã HD giữ riêng (`hdCode`) |

### 2.10 Thông báo (NotificationType, 14 loại)

Code và preview có đủ 14 loại: TASK_ASSIGNED, TASK_APPROVED, TASK_REJECTED, TRANSFER_RECEIVED, EXTENSION_APPROVED, EXTENSION_REJECTED, REVIEW_REQUIRED, REVISION_REQUIRED, TASK_COMPLETED, COMMENT_ADDED, DEADLINE_REMINDER, ALL_FAILED, PLAN_APPROVAL_REQUESTED, EXTENSION_REQUESTED.

Điểm lệch:
- `COMMENT_ADDED`: code chỉ gửi khi **được nhắc tên**. Preview viết "{a} bình luận trong {t}" và "Khi có bình luận mới trong công việc".
- `DEADLINE_REMINDER`: code nhắc trước 3 ngày, preview ghi 24 giờ.
- `TRANSFER_RECEIVED`: code dùng **cả khi việc bị trả lại** ("Công việc được trả lại"). Preview không có mẫu tin này.
- `TASK_ASSIGNED` khi **giao lại**: code ghi "Được giao lại: …". Preview không có.
- Trang Thông báo đầy đủ (tab, lọc loại, nhóm theo ngày): TỰ THÊM.

### 2.11 Helpdesk sync và mapping

| Tính năng | Code | Preview |
|---|---|---|
| Đồng bộ tay / tự động, lịch sử 5 lần gần nhất | `helpdesk-sync.service.ts`, `SyncHistorySection` | CÓ |
| Tự tạo việc từ ticket "Hoàn thành" có IT Support khớp nhân sự; không khớp thì vào danh sách UNASSIGNED; không có IT Support thì gán Boss | `ticket-processor.service.ts:54-130` | CÓ (`hd.as.hint*`, view "Cần chú ý") |
| Gán người / tạo việc từng ticket hoặc hàng loạt / xóa ticket | `unassigned/[id]` POST + DELETE, `push-to-tasks` | CÓ |
| Đặt lại dữ liệu bằng OTP (ADMIN) | `reset/request-otp`, `reset` | CÓ (`hd.reset.*`, ghi rõ chỉ Admin) |
| Thử lại các ticket tạo việc lỗi | `sync/retry` | MỘT PHẦN |
| Nhập tay JSON | `ImportSection`, `ManualImportCard`: **code chết, không được gắn vào trang** | Preview CÓ cả luồng (`hd.imp.*`, 108 chuỗi) → **cần xác nhận** có làm lại không |
| Map trường (Windows-1252, fuzzy key) | `ticket-normalizer.ts`, `docs/HELPDESK_FIELD_MAPPING.md` | Không áp dụng (backend) |

### 2.12 Settings sections

| Mục | Ai vào được (code) | Preview |
|---|---|---|
| Mức ưu tiên, Loại công việc, Mẫu hoàn thành | ADMIN/BOSS; EMPLOYEE nếu có tính năng tương ứng (`settings-guard.ts`, `requireSettingsPermission`) | CÓ |
| Profile | như trên (feature `profile`) | CÓ (`profile.html`) |
| Thông báo | ADMIN/BOSS sửa prefs dùng chung; EMPLOYEE (có feature) chỉ xem | CÓ (`set.nt.roNote`) |
| Báo cáo định kỳ, Nhắc quá hạn | ADMIN/BOSS (`SettingsMenu.tsx:110`) | CÓ |
| Bảo mật | **ADMIN** (`api/settings/security`) | CÓ |
| SMTP + Mẫu email | **ADMIN** (menu); API mẫu email cho ADMIN/BOSS | CÓ |
| Chung (múi giờ) | **ADMIN**, route mồ côi | CÓ (có ghi chú) |

Ghi chú: các trang `/settings/security`, `/smtp`, `/overdue-reminder` chỉ được chặn ở layout (`requireSettingsFeature()` không có featureKey). Nhân viên có menu settings vẫn mở được trang, chỉ bị chặn ở API. Nên chặn lại khi port.

### 2.13 Bảo mật

| Tính năng | Code | Preview | Ghi chú |
|---|---|---|---|
| Rate limit API + khóa đăng nhập (5 lần, 15 phút) | `lib/rate-limit.ts`, `settings/types.ts:192-198` | CÓ (`set.sec.rl*`, `au.scn.locked/rate`) | |
| Chính sách mật khẩu (độ dài, hoa, thường, số, ký tự đặc biệt, hết hạn) | `password-validator.ts` | CÓ | `historyCount` có trong cấu hình nhưng **không được áp dụng** (`password-validator.ts:90`); preview không hiện, vậy là hợp lý |
| Tự đăng xuất khi không thao tác (mặc định 30 phút) | `IdleTimeoutProvider.tsx` | MỘT PHẦN | Có màn login "phiên đã kết thúc". **Thiếu toast cảnh báo 1 phút trước khi đăng xuất** |
| Thời gian phiên tối đa (24 giờ) | `session-config.ts:37-44` | CÓ | |
| Cho phép đăng nhập nhiều thiết bị | Có lưu cấu hình nhưng **không có code áp dụng** | CÓ (`set.sec.multi`) | Preview hứa một tính năng chưa có |
| Thu hồi phiên (revoke session) | Chỉ có enum `REVOKE_SESSION`, **không có tính năng** | Không có | Khớp |
| Khóa user thì mất phiên trong ≤30 giây | `auth-utils.ts:37-73` | Không áp dụng | |
| Cấm EMPLOYEE đổi mật khẩu của ADMIN/BOSS | `api/hr/users/[id]/route.ts:67-71` | Không áp dụng | |

### 2.14 Profile

| Tính năng | Code | Preview |
|---|---|---|
| Ảnh đại diện JPG/PNG ≤2 MB, màu nền chữ cái | `api/upload/avatar:25-30` | CÓ |
| Tên, email (đổi thì gửi link xác nhận), điện thoại, phòng ban, chức danh, giới thiệu, múi giờ | `api/settings/profile/route.ts:6-15` | CÓ |
| Đổi mật khẩu | `settings/profile/change-password` | CÓ |
| Ngôn ngữ giao diện | Không có (US5.6 i18n đang hoãn) | TỰ THÊM (`pf.lang`) |

### 2.15 Analytics

| Tính năng | Code | Preview |
|---|---|---|
| KPI, biểu đồ tháng, hiệu suất theo người, donut quy trình, phễu, thời gian trung bình theo loại | `analytics/page.tsx:188-209` | CÓ |
| Drill-down KPI | `DrillDownModal`, `api/analytics/drilldown` | CÓ (`rp.dd.*`) |
| Research: việc quá hạn + workload | `analytics/research/page.tsx` | THIẾU |
| Phân quyền | Menu analytics: ADMIN/BOSS hoặc EMPLOYEE có menu; `performance` của EMPLOYEE chỉ trả số của chính họ (`api/analytics/performance:14`) | Preview cho boss xem, ẩn với nhân viên |

### 2.16 Seed: vai trò, phòng ban, danh mục

| Seed | Code | Preview |
|---|---|---|
| Vai trò | ADMIN "Quản trị viên", BOSS "**Quản lý**", EMPLOYEE "Nhân viên" (`seed.ts:20-44`) | boss = "Trưởng phòng" (`role.boss`), nhưng `pp.role.BOSS` = "Quản lý". `pp.px.r.MANAGER` "Quản lý" là vai trò dự kiến |
| Phòng ban | **Không có bảng**: `UserProfile.department` là text tự do; Helpdesk có `phongBan` riêng | Preview có cột và lọc phòng ban (text) |
| Ưu tiên | Khẩn cấp / Cao / Bình thường / Thấp | Khẩn / Cao / Thường / Thấp (lệch nhẹ; DB quyết định) |
| Loại việc | Phần mềm, Phần cứng, Mạng, Phát triển, Khác | Phần mềm, Phần cứng, Mạng, Bảo mật, Tài khoản, Hỗ trợ, Khác (DB quyết định) |
| Mẫu hoàn thành | 5 mẫu | CÓ |
| Tag | Có model `Tag/TaskTag` nhưng **không dùng** | Không có |

---

## 3. THIẾU — cần bổ sung vào preview (theo mức quan trọng)

### P0: ảnh hưởng nghiệp vụ hoặc phân quyền
1. **Vai trò ADMIN tách khỏi Trưởng phòng.**
   - Thêm lựa chọn "Admin" vào bộ chọn vai trò.
   - Các hành động chỉ Admin có: Khôi phục, nút Giao lại theo ma trận UI, Bảo mật/SMTP/Chung, tạo người dùng, quyền riêng, reset Helpdesk, xóa bình luận của người khác.
   - Admin **không nhận email** thông báo việc.
2. **Giao lại khi mọi người từ chối (allFailed).**
   - Dữ liệu mẫu: mọi người làm đều từ chối hoặc đã chuyển giao.
   - Banner cho người tạo và Trưởng phòng.
   - Hộp Giao lại chọn **nhiều** người; việc về "Chờ nhận việc".
   - Người tạo được Hủy.
   - Lịch sử hiển thị "Giao lại cho …".
3. **Boss/Admin là người làm.** Khi tự giao cho mình hoặc được giao, phải thấy Nhận việc, Từ chối, Báo cáo, Chuyển giao, Xin gia hạn như người làm.
4. **Từ chối nhận việc được chuyển giao thì trả về người chuyển.** Cần tin nhắn, lịch sử và thông báo "Công việc được trả lại".
5. **Xem việc Đã hủy** (tab hoặc lọc trạng thái). Nếu không có, nút Khôi phục không bao giờ tới được.

### P1: màn hình hoặc thao tác có thật bị bỏ sót
6. **Danh sách công việc:**
   - Phân trang + cỡ trang 10/20/50/100.
   - Lọc Loại, lọc Nguồn (TechOps/Helpdesk).
   - Lọc Thời gian (Hôm nay / 7 ngày / 30 ngày / Quá hạn + từ–đến).
   - Bảng lọc thật cho nút "Lọc".
7. **Đánh dấu đã xem tất cả** ở view "Mới xong".
8. **Hộp Báo cáo xong:** chọn **mẫu hoàn thành** (lọc theo loại việc, có trạng thái "chưa có mẫu"), **dán ảnh**, giới hạn 3 tệp / 10 MB / định dạng. Hộp Bổ sung cũng vậy.
9. **Toast cảnh báo hết phiên** (1 phút trước khi tự đăng xuất).
10. **Quyền theo menu cho Nhân viên.** Code cho phép cấp cho nhân viên các menu Nhật ký (chỉ log của mình), Báo cáo, Helpdesk (xem), Nhân sự (xem đồng nghiệp, sửa chính mình), Cài đặt từng mục. Preview đang ẩn hẳn với nhân viên; cần trạng thái "nhân viên được cấp quyền".
11. **Trang Research** (Việc quá hạn + Cân bằng khối lượng): vẽ thêm, hoặc chủ dự án quyết định bỏ (xem câu hỏi Q6).

### P2: chi tiết
12. Thử lại tạo việc từ ticket bị lỗi (Helpdesk `sync/retry`).
13. Xóa bình luận: thêm quyền của Admin.
14. Mô tả hộp Khôi phục: "mọi người làm sẽ được giao lại từ đầu (Chờ nhận)".
15. Danh sách chuyển giao phải có cả Trưởng phòng (code cho chuyển cho BOSS).
16. Thông báo "Được giao lại", "Công việc được trả lại".

---

## 4. Chỗ preview hiển thị KHÁC logic code

| # | Chỗ | Code | Preview |
|---|---|---|---|
| L1 | Lý do Từ chối kế hoạch | Không bắt buộc | Bắt buộc ≥10 ký tự |
| L2 | Lý do Từ chối nhận / Hủy / Xin gia hạn | Bắt buộc, chỉ cần không rỗng | ≥10 ký tự |
| L3 | Xin gia hạn | Chỉ **người làm đang IN_PROGRESS**, việc IN_PROGRESS. UI chỉ hiện ở **Phê duyệt** (`useTaskPermissions.ts:113`); service không kiểm quy trình | Nhân viên là người làm **hoặc người tạo**, ở WAITING_ACK / IN_PROGRESS / PENDING_REVIEW, cả Trực tiếp |
| L4 | Hủy, phía Boss | Service cho BOSS/ADMIN hủy mọi trạng thái chưa xong. UI ma trận: **BOSS không có nút Hủy ở Chờ duyệt và Chờ nghiệm thu**, ADMIN có | Boss hủy được mọi trạng thái |
| L5 | Hủy, phía nhân viên tạo việc (Trực tiếp, Chờ nhận / Đang làm) | Service cho phép (trừ khi Bắt buộc); UI ma trận **không hiện** (chỉ hiện khi allFailed) | Hiện |
| L6 | Khôi phục | Chỉ ADMIN | Boss |
| L7 | Giao lại | Service: BOSS/ADMIN, hoặc người tạo nếu Trực tiếp. UI: **chỉ ADMIN** thấy nút (`taskActionMatrix.ts:32,45`) | Không có |
| L8 | Bổ sung báo cáo | Chỉ quy trình Phê duyệt | Cả Trực tiếp |
| L9 | Nhân viên xem việc | Thấy việc mình tạo (mọi trạng thái) và việc được giao (trừ PENDING_APPROVAL), **kể cả việc đã Xong** (`task-query.service.ts:195-210`) | Ẩn việc Đã xong với nhân viên; ẩn việc đã từ chối hoặc chuyển đi |
| L10 | Bình luận khi việc đã Xong hoặc Hủy | Vẫn bình luận được | Khóa |
| L11 | Gia hạn bị rút | Lưu `REJECTED` | Trạng thái riêng "Đã rút" |
| L12 | Trạng thái người làm | Nhận việc = IN_PROGRESS ngay; báo cáo xong = COMPLETED | Có "Đã nhận" tách khỏi "Đang làm"; "Đã báo cáo" |
| L13 | Mã việc | `26-0001` | `CV-1019` |
| L14 | Nhắc hạn | Trước 3 ngày, 08:00, mặc định tắt | "24 giờ trước" |
| L15 | Digest khi không chọn người nhận | Chỉ BOSS | "Trưởng phòng và Admin" |
| L16 | Email COMMENT_ADDED | Chỉ người được @nhắc | "Khi có bình luận mới" |
| L17 | Nhiều thiết bị | Có cấu hình nhưng không áp dụng | Hiện như tính năng đang chạy |
| L18 | Nhật ký với nhân viên | Có thể được cấp (chỉ log của mình) | "Chỉ dành cho Trưởng phòng và Quản trị" (`lg.na.d`) |
| L19 | Tiêu đề tối đa | 150 khi tạo, 255 khi sửa; nội dung 5000 khi tạo, không giới hạn khi sửa | `maxT = isEdit ? 255 : 150` (khớp) |
| L20 | Nhãn trạng thái và nút | Xem 2.4.1 | Đổi tên (cố ý cho V2), cần chốt |
| L21 | Tên vai trò BOSS | "Quản lý" (DB) | "Trưởng phòng" (`role.boss`, `pp.px.r.BOSS`) xen với "Quản lý" (`pp.role.BOSS`) |

---

## 5. Vai trò & quyền hiện tại (theo code)

### 5.1 Vai trò
- Bảng `Role` (`schema.prisma:11`), **không phải enum**. Seed 3 dòng, `isSystem=true` (`seed.ts:20-44`):
  - `ADMIN`: "Quản trị viên"
  - `BOSS`: "**Quản lý**"
  - `EMPLOYEE`: "Nhân viên"
- Tên vai trò viết cứng dạng `'ADMIN' | 'BOSS' | 'EMPLOYEE'` ở khoảng 60 chỗ (service, route, cron, sidebar, ma trận).
- **Nếu thêm vai trò thứ 4 (vd MANAGER) mà không sửa code:**
  - Người đó rơi vào nhánh `else` (coi như EMPLOYEE) trong `taskActionMatrix.ts:113`.
  - Bị coi là "không đặc quyền" ở mọi chỗ kiểm `['ADMIN','BOSS']`.
  - **Không xuất hiện trong danh sách giao việc** (`assignable-users/route.ts:17` chỉ lấy EMPLOYEE+BOSS).
  - Không nhận digest hay nhắc hạn dành cho Boss.

### 5.2 Nơi kiểm quyền (6 lớp)

| Lớp | File | Phạm vi | Có hiệu lực? |
|---|---|---|---|
| `requireAuth()` | `lib/auth-utils.ts:37-73` | Mọi API; kiểm `isActive` qua Redis 30 giây | Có |
| `requireRole([...])` | `auth-utils.ts:79-91` | HR, Helpdesk, Settings (SMTP / Security / General = ADMIN), task-reference | Có |
| `requireMenuAccess` / `requireMenuPermission` (sidebar `visibleMenus` + `featurePermissions`) | `lib/settings-guard.ts:54-71`, `auth-utils.ts:~170` | Trang analytics, helpdesk, hr, logs; API analytics. ADMIN/BOSS luôn qua | Có |
| `requireSettingsFeature` / `requireSettingsPermission` / `canAccessSettingsFeature` | `settings-guard.ts:13-43`, `auth-utils.ts:~133` | Mức ưu tiên, loại việc, mẫu hoàn thành, profile, thông báo | Có |
| Kiểm `role.name` trong service workflow | `workflow/*.service.ts`, `extension.service.ts`, `task-update.service.ts`, `task-query.service.ts` | **Quyền thật cho hành động công việc** | Có |
| `taskActionMatrix.ts` + `useTaskPermissions.ts` | `modules/tasks/actions/config/taskActionMatrix.ts:15-193` | **Chỉ để hiện hoặc ẩn nút** (client) | Có (UI) |
| `requirePermission()` + `RoleStatusAction` / `UserStatusAction` (3D: vai trò × trạng thái × quy trình × hành động, có `isForceModeLocked`) | `auth-utils.ts:99-125`, `rbac/permission.service.ts`, seed `seed.ts:239-370` | Có UI sửa quyền riêng ở HR (ADMIN) | **KHÔNG**: không API nào gọi `requirePermission` |
| `RolePermission` (resource:action, vd `USER:DELETE`) | seed `seed.ts:131-215`, `permission.service.ts:129` | — | **KHÔNG**: không có chỗ nào gọi |

### 5.3 Ma trận ai làm gì (rút gọn, theo code thật)

Ký hiệu: **A** ADMIN · **B** BOSS · **E-tạo** nhân viên là người tạo · **E-làm** nhân viên là người làm · "(UI≠)" nghĩa là service cho phép nhưng ma trận UI không hiện nút, hoặc ngược lại.

| Hành động | A | B | E-tạo | E-làm | Nguồn |
|---|---|---|---|---|---|
| Xem mọi việc | ✓ | ✓ | chỉ việc của mình | chỉ việc được giao, trừ khi đang Chờ duyệt | `task-query.service.ts:195-210` |
| Tạo việc | ✓ (bỏ qua bước duyệt) | ✓ (bỏ qua bước duyệt) | ✓ (Phê duyệt → Chờ duyệt) | — | `task-create.service.ts:60-84` |
| ★ Quan trọng, theo dõi "chưa xem" | ✓ | ✓ | — | — | `task-tracking.service.ts:20` |
| Sửa | Chờ duyệt / Chờ nhận / Đang làm / Chờ nghiệm thu | như A | Trực tiếp: Chờ nhận, Đang làm. Phê duyệt: chỉ khi Chờ duyệt | Trực tiếp: khi Đang làm | `task-update.service.ts:37-48` |
| Đổi quy trình | ✓ (trừ đổi về Trực tiếp khi Chờ nghiệm thu) | ✓ | Có điều kiện | — | `task-update.service.ts:131-162` |
| Bật Bắt buộc | ✓ (chỉ Phê duyệt) | ✓ | — | — | `task-update.service.ts:38` |
| Duyệt / từ chối kế hoạch | ✓ | ✓ | — | — | `approval.service.ts:24,76` |
| Nhận / từ chối nhận | khi là người làm | khi là người làm | không tự từ chối việc mình tạo | ✓ (không từ chối được nếu Bắt buộc) | `assignment.service.ts:126`, matrix:126-142 |
| Báo cáo xong | khi là người làm | khi là người làm | — | ✓ | `lifecycle.service.ts:25` |
| Bổ sung báo cáo | — | — | — | ✓ (chỉ Phê duyệt) | `useTaskPermissions.ts:121` |
| Chuyển giao | khi là người làm | khi là người làm | — | ✓ (Đang làm, không Bắt buộc) | `assignment.service.ts:25` |
| Nghiệm thu / yêu cầu làm lại | ✓ | ✓ | — | — | `approval.service.ts:146,199` |
| Xin gia hạn | — | — | — | ✓ (Đang làm; UI chỉ ở Phê duyệt) | `extension.service.ts:32` |
| Duyệt gia hạn | ✓ | ✓ | — | — | `extension.service.ts:126` |
| Giao lại (allFailed) | ✓ | ✓ (UI≠: không có nút) | Trực tiếp ✓ (UI≠: không có nút) | — | `assignment.service.ts:232-245`, matrix:32,45 |
| Hủy | ✓ | ✓ (UI≠: không có nút ở Chờ duyệt, Chờ nghiệm thu) | Phê duyệt: chỉ khi Chờ duyệt. Trực tiếp: mọi trạng thái trừ khi Bắt buộc (UI≠: chỉ khi allFailed) | — | `lifecycle.service.ts:198-230` |
| Khôi phục | ✓ | — | — | — | `restore.service.ts:16` |
| Bình luận | ✓ | ✓ | ✓ | ✓ | `comment.service.ts:98-110` |
| Xóa bình luận người khác | ✓ | — | — | — | `comment.service.ts:215` |
| Tạo user | ✓ | — | — | — | `api/hr/users/route.ts:57` |
| Sửa / khóa / đổi vai trò / bulk / xuất CSV / gửi link reset | ✓ | ✓ | chỉ sửa chính mình | — | `api/hr/users/[id]/route.ts:36-80` |
| Xóa user | ✓ | ✓ (seed nói BOSS không được, nhưng không áp dụng) | — | — | `api/hr/users/[id]/route.ts:116` |
| Phân quyền menu (theo người) | ✓ | ✓ | — | — | `api/hr/sidebar-permissions:91` |
| Quyền công việc riêng (3D) | ✓ (không có hiệu lực) | — | — | — | `api/hr/users/[id]/permissions` |
| Helpdesk: đồng bộ, lịch, gán, tạo việc, xóa ticket | ✓ | ✓ | xem nếu có menu | | `api/integrations/helpdesk/*` |
| Helpdesk: reset dữ liệu (OTP) | ✓ | — | — | — | `reset/route.ts:12` |
| Analytics | ✓ | ✓ | nếu có menu; hiệu suất chỉ của mình | | `requireMenuPermission('analytics')` |
| Nhật ký công việc / người dùng | ✓ (tất cả) | ✓ (tất cả) | nếu có menu + feature; chỉ log của mình | | `api/logs/*` |
| Tra cứu mã | ✓ | ✓ | — | — | `api/logs/task-reference:6` |
| Cài đặt: ưu tiên, loại việc, mẫu hoàn thành, profile | ✓ | ✓ | nếu có feature | | `settings-guard.ts` |
| Cài đặt: thông báo (prefs chung) | ✓ | ✓ | xem | | `notification-prefs` |
| Cài đặt: digest, nhắc quá hạn, mẫu email | ✓ | ✓ | — | — | `digest-config:28`, `overdue-reminder-config:23`, `email-templates:23` |
| Cài đặt: bảo mật, SMTP, chung | ✓ | — | — | — | `requireRole(['ADMIN'])` |
| Nhận email thông báo việc | — (Admin không nhận) | ✓ | ✓ | ✓ | `_shared.ts:118-126` |
| Nhận digest mặc định | — | ✓ | — | — | `digest.ts:63` |

Feature key của quyền menu (`hr/permissions/config.ts`):
- `logs`: task_activity, user_activity
- `analytics`: không có feature con
- `helpdesk`: không có feature con
- `hr`: edit, change_password, deactivate, delete
- `settings`: priorities, task_types, completion_templates, profile, notifications

Lưu ý: nhân viên được cấp `hr.deactivate` hoặc `hr.delete` vẫn thấy nút, nhưng **API chặn** (chỉ ADMIN/BOSS được khóa hay xóa).

### 5.4 Đầu vào cho việc thêm vai trò "Quản lý"
- DB đã gắn nhãn **"Quản lý" cho BOSS**. Cần chốt tên trước: BOSS đổi thành "Trưởng phòng" và vai trò mới là "Quản lý", hay đặt tên khác.
- Những chỗ phải sửa khi thêm vai trò:
  - (1) `taskActionMatrix.ts`: thêm nhánh vai trò mới.
  - (2) Khoảng 60 chỗ kiểm `['ADMIN','BOSS']`; nên gom về một helper kiểu `isPrivileged(role)` / `can(role, cap)`.
  - (3) `assignable-users`.
  - (4) Cron digest, nhắc hạn, nhắc quá hạn (người nhận).
  - (5) `notifyBosses`.
  - (6) `SettingsMenu` / `settings-guard` / `requireMenuAccess`.
  - (7) `TaskTrackingMenu` (★, chưa xem).
  - (8) Seed `Role` + `RoleStatusAction`.
- Đây là lúc nên quyết định: **bật lại 3D RBAC** (`requirePermission`) để quyền lấy từ DB, hay tiếp tục viết cứng theo tên vai trò.

---

## 6. CẦN CHỦ DỰ ÁN XÁC NHẬN

**Q1. Tên các vai trò.** BOSS trong DB đang có nhãn "Quản lý", còn preview gọi là "Trưởng phòng" và lại thêm MANAGER "Quản lý".
- (a) BOSS = "Trưởng phòng", vai trò mới MANAGER = "Quản lý". Phải sửa nhãn trong seed.
- (b) Giữ BOSS = "Quản lý"; vai trò mới đặt tên khác (vd "Tổ trưởng" hoặc "Phó phòng").
- (c) Không thêm vai trò mới; chỉ đổi nhãn.

**Q2. Vai trò mới "Quản lý" được làm gì?**
- (a) Như BOSS nhưng không vào được Nhân sự và Cài đặt hệ thống.
- (b) Duyệt kế hoạch và nghiệm thu cho **nhóm của mình** (cần thêm khái niệm nhóm hoặc phòng ban).
- (c) Chỉ xem toàn bộ và báo cáo, không duyệt.
- (d) Khác (mô tả).

**Q3. Preview có tách Admin khỏi Trưởng phòng không?**
- (a) Có, thêm "Admin" vào bộ chọn vai trò preview.
- (b) Không, preview chỉ là bố cục; quyền Admin ghi chú bằng chữ.

**Q4. Quyền công việc riêng (3D RBAC) hiện không có hiệu lực.**
- (a) V2 bật lại: API dùng `requirePermission`, ma trận lấy từ DB.
- (b) Bỏ hẳn màn "Quyền công việc" theo người; giữ quyền viết cứng.
- (c) Giữ UI, sửa sau.

**Q5. Quyền menu "Theo vai trò" (preview mới) đang thay cho "theo từng người" (code).**
- (a) Làm thêm bảng mặc định theo vai trò + ngoại lệ theo người, như preview.
- (b) Giữ theo người như V1.

**Q6. Trang Research (Việc quá hạn + Workload) đang là route mồ côi.**
- (a) Đưa vào Báo cáo thành tab thứ 3.
- (b) Gộp các khối này vào tab Tổng quan.
- (c) Bỏ.

**Q7. Nhập tay JSON Helpdesk** (code chết, preview vẽ đủ luồng).
- (a) Làm lại ở V2.
- (b) Bỏ khỏi preview.

**Q8. Nháp (DRAFT), Bảng Kanban kéo thả, trang Thông báo, xuất Excel danh sách việc và nhật ký, khóa bình luận khi xong** đều là tính năng **mới** (cần backend). Với từng tính năng:
- (a) Đưa vào V2.
- (b) Để V2.1.
- (c) Bỏ.

**Q9. Nhãn trạng thái và nút mới** (Chờ nhận việc / Chờ nghiệm thu / Đã xong / Nhận việc / Báo cáo xong / Nghiệm thu):
- (a) Chốt bộ nhãn preview cho V2.
- (b) Giữ nhãn V1.

**Q10. Lý do khi từ chối hoặc hủy:**
- (a) Thống nhất ≥10 ký tự cho mọi lý do (sửa code).
- (b) Giữ như code: Từ chối kế hoạch không bắt buộc, còn lại chỉ cần không rỗng (sửa preview).

**Q11. Ai được Hủy?**
- (a) Theo service: Boss hủy mọi trạng thái; nhân viên tạo việc Trực tiếp được hủy khi chưa xong. Sửa UI V1 cho khớp.
- (b) Theo ma trận UI V1: Boss không hủy ở Chờ duyệt / Chờ nghiệm thu; nhân viên chỉ hủy khi allFailed. Sửa preview.

**Q12. Khôi phục và Giao lại:**
- (a) Chỉ Admin (như code).
- (b) Mở cho Trưởng phòng.
- (c) Giao lại mở cho Trưởng phòng và người tạo (đúng như service), Khôi phục chỉ Admin.

**Q13. Xin gia hạn ở quy trình Trực tiếp và cho người tạo:**
- (a) Như code: chỉ người làm, chỉ Phê duyệt.
- (b) Như preview: cả Trực tiếp và người tạo.
- (c) Chỉ người làm, cả hai quy trình.

**Q14. Nhân viên xem việc Đã xong của mình:**
- (a) Có, như code; thêm tab "Đã xong" cho nhân viên.
- (b) Không, như preview.

**Q15. Trạng thái người làm "Đã nhận" tách khỏi "Đang làm"** (preview), trong khi code gộp:
- (a) Gộp như code.
- (b) Tách, cần đổi luồng.

**Q16. Định dạng mã việc:**
- (a) Giữ `YY-NNNN` (26-0001).
- (b) Đổi `CV-NNNN`. Ảnh hưởng tra cứu mã, email, Excel cũ.

**Q17. Nhắc hạn:**
- (a) Giữ trước 3 ngày lúc 08:00 qua env.
- (b) Đổi thành 24 giờ.
- (c) Đưa lên Cài đặt để chỉnh trên UI.

**Q18. Digest khi không chọn người nhận:**
- (a) Chỉ Boss (như code).
- (b) Boss + Admin (như preview; sửa code).

**Q19. "Cho phép đăng nhập nhiều thiết bị" chưa được áp dụng:**
- (a) Làm thật ở V2 (cần lưu phiên và thu hồi phiên).
- (b) Ẩn khỏi preview.

**Q20. Bulk action trên danh sách công việc** (V1 không có):
- (a) Không cần.
- (b) Cần (vd gán ★, hủy hàng loạt, xuất), làm mới ở V2.

**Q21. Chuyển ngôn ngữ EN trong preview**, trong khi US5.6 i18n đang hoãn:
- (a) Ẩn khỏi V2.
- (b) Giữ, làm sau.

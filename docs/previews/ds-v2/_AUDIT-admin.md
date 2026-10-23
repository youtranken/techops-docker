# Audit UI khu vực QUẢN TRỊ (Admin) — chuẩn bị Design System v2

> Ngày: 2026-10-22 · Chế độ: **chỉ đọc** (không sửa code) · Người audit: Claude
> Phạm vi: `src/app/(dashboard)/{analytics,helpdesk,hr,logs,settings}` + `src/modules/{analytics,helpdesk,hr,logs,settings,rbac,notifications}` — 10.622 dòng TSX.
> Mọi số liệu dưới đây đếm bằng grep trên đúng tập file trên (trừ test).

---

## 0. Tóm tắt nhanh — 10 vấn đề nặng nhất

| # | Vấn đề | Bằng chứng | Mức |
|---|--------|-----------|-----|
| 1 | **Hai "hệ" style song song**: Analytics/Helpdesk-modal/Notifications dùng màu Tailwind cứng (`bg-white`, `text-gray-900`, `border-gray-200`, `dark:*` thủ công) — HR/Logs/Settings dùng token shadcn (`bg-card`, `text-muted-foreground`, `border-border`). | 515 lần `text-{màu}-NNN`, 298 lần `bg-{màu}-NNN`, 389 lần `dark:`; `analytics/page.tsx:115-208`, `AssignHelpdeskModal.tsx:59-131`, `NotificationBell.tsx:34-51` | Cao |
| 2 | **Tiêu đề trang (H1) có 3 kiểu, section (H2/H3) có 13 kiểu** khác nhau. | H1: `text-2xl font-bold tracking-tight` ×4, `text-xl font-bold tracking-tight` ×3, `text-2xl font-bold text-gray-900` ×3. Bảng đầy đủ ở §1 | Cao |
| 3 | **Switch có 4 bản cài khác nhau** (shadcn `<Switch>`, 3 bản tự viết `role="switch"` với kích thước/màu khác nhau) + Checkbox có 3 bản (shadcn `<Checkbox>`, `<input type=checkbox accent-primary>`, icon `CheckSquare/Square`). | `CronPanel.tsx:86`, `DigestSection.tsx:97`, `SecurityControls.tsx:14` (`bg-muted` khi tắt), `SmtpServerFields.tsx:44` (h-5 w-9), `OverdueReminderSection.tsx:232` | Cao |
| 4 | **Phân trang: 6 bảng — 5 cách làm khác nhau** (số trang + ‹›, "Trước/Tiếp", icon chevron, ẩn khi 1 trang / luôn hiện, page-size select native vs shadcn, 10/20/50/100 vs 10/25/50/100). Có bảng **không phân trang** (Settings, PerformanceTable cắt cứng 15 dòng). | `TaskListTable.tsx:110-155`, `TicketPagination.tsx`, `hr/users/page.tsx:213-237`, `LogPagination.tsx`, `UserHistoryModal.tsx:60-67`, `PerformanceTable.tsx:67` | Cao |
| 5 | **Modal tự viết (div fixed) thay vì `<Dialog>`**: không trap focus, không Esc, nút đóng "×" ký tự, bo `rounded-2xl` khác Dialog `rounded-lg`. | `DrillDownModal.tsx:61-67`, `AssignHelpdeskModal.tsx:51-67`, `BulkAssignModal.tsx:37-46`, `TicketDetailSheet.tsx:51-57` (sheet tự viết dù có `ui/sheet.tsx`) | Cao |
| 6 | **`window.confirm()` còn sót 3 chỗ** trong Settings (trong khi Helpdesk/HR đã dùng AlertDialog). | `PrioritiesSection.tsx:43`, `TaskTypesSection.tsx:43`, `ReportTemplatesSection.tsx:157` | Cao |
| 7 | **Màu chart viết cứng hex, không dùng `--chart-*`** (globals.css có sẵn `--chart-1..5` cho light/dark nhưng 0 lần dùng). Tooltip/legend cũng hex cứng → dark mode sai màu. | 47 mã hex; `var(--chart` = 0. `MonthlyOverviewChart.tsx:39,58-64`, `FlowDonutChart.tsx:10-11,57,61`, `WorkloadChart.tsx:10`, `OnTimeByUserChart.tsx:19-22` | Cao |
| 8 | **Chiều cao control lẫn lộn h-7/h-8/h-9/h-10/py-1.5** trên cùng một filter bar; Input/Select mặc định h-10 nhưng 54 chỗ ép về h-8/h-9; `<select>` native (13 chỗ) đứng cạnh shadcn Select (112). | `h-8`×28, `h-9`×24, `h-7`×12; `analytics/task-list/page.tsx:130-199` (native select py-1.5 + Button sm h-9) | TB-Cao |
| 9 | **Chữ siêu nhỏ viết tay `text-[10px]/[11px]/[12px]/[13px]/[28px]`: 58 lần** — header bảng Analytics dùng 10px uppercase, Helpdesk/Logs dùng `text-xs` uppercase, HR/Settings dùng mặc định shadcn (không uppercase). | `TaskListTable.tsx:52-61` (10px), `PerformanceTable.tsx:44-57` (11px), `HelpdeskTicketTable.tsx:49` (xs), `UserTable.tsx:219-225` (mặc định) | TB |
| 10 | **Lỗi chính tả & Anh-Việt lẫn lộn**: header cột "Ư u tiên" (có dấu cách), "Hủy"×19 vs "Huỷ"×4, "Xóa"×15 vs "Xoá"×6, "Tùy/Tuỳ", "Task"×211 vs "công việc"×24; tên trang tiếng Anh ("Analytics", "Audit Logs", "Task Activity", "Research & Bottlenecks"). Action log `REVIEW_APPROVED` hiển thị "Chờ Review" (sai nghĩa). | `HelpdeskTicketTable.tsx:20`, `TaskLogRow.tsx:32`, `TaskLogFilters.tsx:22`, `logs/layout.tsx:23`, `LogsNav.tsx:20-35` | TB |

Ngoài ra: **code chết 10 component** (bao gồm cả "Import tay" Helpdesk — UI không còn được mount ở đâu) → cần quyết định giữ/bỏ trước khi vẽ preview (§10).

---

## 1. Typography

### 1.1 Thống kê cỡ chữ / độ đậm (toàn phạm vi)

| Class | Số lần | Ghi chú |
|-------|-------:|---------|
| `text-xs` | 198 | |
| `text-sm` | 205 | |
| `text-base` | 9 | |
| `text-lg` | 11 | |
| `text-xl` | 7 | |
| `text-2xl` | 9 | |
| `text-[10px]` | 19 | header bảng Analytics, badge vai trò, mã task |
| `text-[11px]` | 27 | KPI title, badge trạng thái, link "Xem" |
| `text-[12px]` | 7 | ô bảng TaskList, notification |
| `text-[13px]` | 4 | tên NV/tên task TaskList, notification title |
| `text-[28px]` | 1 | số KPI (`KpiCard.tsx:50`) |
| `font-medium` | 132 | |
| `font-semibold` | 87 | |
| `font-bold` | 19 | |
| `font-black` | 2 | mã task trong Logs (`TaskLogRow.tsx:55`, `TaskRefTable.tsx:33`) |

→ **5 cỡ chữ lẻ (px tuỳ ý)**, `font-black` dùng cho mã task là ngoại lệ duy nhất.

### 1.2 Tiêu đề trang (H1) — mỗi khu một kiểu

| Trang | Class | Icon trước tiêu đề | Mô tả phụ | File:dòng |
|-------|-------|---------------------|-----------|-----------|
| Analytics | `text-2xl font-bold text-gray-900 dark:text-white` | không | `text-gray-500` (không `text-sm`) | `analytics/page.tsx:115-116` |
| Danh Sách Task | như trên | không | như trên | `analytics/task-list/page.tsx:123-124` |
| Research & Bottlenecks | như trên | không | như trên | `analytics/research/page.tsx:41-42` |
| Helpdesk | `text-2xl font-bold tracking-tight` | không | `text-sm text-muted-foreground mt-1` | `helpdesk/page.tsx:15-16` |
| Quản lý nhân viên | `text-2xl font-bold tracking-tight` | `Users h-6` trơn, muted | badge đếm | `hr/users/page.tsx:94-109` |
| Phân quyền Sidebar | `text-2xl font-bold tracking-tight` | `Shield h-6` trơn | text-sm | `PermissionsMatrixSection.tsx:44-47` |
| Audit Logs | `text-xl font-bold tracking-tight` | ô `p-2 rounded-xl bg-primary/10` | text-sm, có `border-b pb-4` | `logs/layout.tsx:18-28` |
| Cài đặt | `text-xl font-bold tracking-tight` | ô `p-2 rounded-xl bg-primary/10` + **SVG inline** | text-sm, `border-b pb-2` | `settings/layout.tsx:9-20` |
| Phân quyền (rbac, chết) | `text-2xl font-bold tracking-tight` | nút back ghost | | `PermissionsMatrix.tsx:101` |

→ 3 cỡ (2xl/xl), 3 kiểu icon (không / trơn / ô nền), 2 kiểu màu (token / gray cứng), 2 khoảng cách đáy (`pb-2` vs `pb-4`).

### 1.3 Tiêu đề section (H2/H3) — 13 biến thể

| Biến thể | Số lần | Nơi dùng |
|----------|-------:|----------|
| `h2 text-lg font-semibold` | 9 | Settings sections (Priorities, TaskTypes, Digest, Notification, Overdue, Smtp, ReportTemplates, Profile, General) |
| `h3 font-semibold text-gray-900 dark:text-white mb-4` | 5 | card Analytics |
| `h3 text-sm font-semibold text-muted-foreground uppercase tracking-wide` | 4 | card Profile (`ProfileAvatar.tsx:66`…) |
| `h2 text-2xl font-bold tracking-tight flex` | 1 | **Security dùng cỡ H1 cho H2** (`SecuritySection.tsx:56`) → trong trang Cài đặt có 2 tiêu đề to chồng nhau |
| `h2 text-xl font-bold tracking-tight` | 1 | "Danh sách ticket" (`TicketListSection.tsx:106`) — section nhưng to ngang H1 Logs/Settings |
| `h3 text-base font-semibold` | 2 | ChangePassword, EmailTemplates |
| `h3 font-semibold text-base` | 1 | SecurityCard |
| `p text-xs font-semibold uppercase tracking-wider text-muted-foreground` | ~7 | CronPanel, TicketDetailSheet nhóm |
| `div text-sm font-medium text-muted-foreground` + emoji/icon | 3 | Smtp sub-section (`SmtpAuthFields.tsx:20-23` dùng emoji 🔐, 2 cái kia dùng lucide) |
| `span text-base font-semibold` + emoji 📋 | 1 | `ManualImportCard.tsx:60` |
| …còn lại (`h2 text-base font-semibold leading-snug`, `h2 text-lg … text-gray-900`) | 3 | modal tự viết |

**Đề xuất chuẩn hoá (token typography):**

| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| `type/page-title` | 24/32 · 700 · tracking-tight · `--foreground` | H1 duy nhất mỗi trang, nằm trong `PageHeader` |
| `type/page-desc` | 14/20 · 400 · `--muted-foreground` | mô tả dưới H1 |
| `type/section-title` | 16/24 · 600 | H2 trong trang (Settings section, card lớn) |
| `type/card-title` | 14/20 · 600 | tiêu đề card/chart |
| `type/overline` | 11/16 · 600 · uppercase · tracking 0.06em · muted | nhóm field, header bảng (CHỌN 1 kiểu cho mọi bảng) |
| `type/body` | 14/20 | |
| `type/caption` | 12/16 · muted | helper text, meta |
| `type/kpi` | 28/32 · 700 · tabular-nums | số KPI |
| `type/mono-code` | 12 · 600 mono | mã task (bỏ `font-black`) |

Cấm `text-[Npx]` ngoài 2 token 11px (overline) và 28px (kpi).

---

## 2. Button

### 2.1 Số liệu

| Chỉ số | Số lần |
|--------|-------:|
| `<Button>` (shadcn) | 79 |
| `<button>` tự viết | 56 |
| `size="sm"` | 51 |
| `size="icon"` | 9 |
| `size="lg"` | 0 |
| `variant="outline"` | 39 |
| `variant="ghost"` | 20 |
| `variant="destructive"` | **1** (`HelpdeskAdminPanel.tsx:105`) |
| `variant="secondary"` | 4 |
| `aria-label` | **3** (toàn phạm vi) |

### 2.2 Nút tự viết class thay vì `<Button>` (nên thay hết)

| File:dòng | Mô tả | Vấn đề |
|-----------|-------|--------|
| `ManualImportCard.tsx:112-120` | "📥 Nhập dữ liệu" `bg-blue-600` | màu cứng, emoji, spinner bằng emoji ⏳ `animate-spin` |
| `SyncStatusCard.tsx:48-55` | "🔄 Get từ API" `bg-blue-600` | như trên (component chết) |
| `PushToTasksSection.tsx:31-37` | "Đẩy sang Task" `bg-green-600` | primary màu xanh lá (component chết) |
| `AssignHelpdeskModal.tsx:119-132` | Hủy `bg-gray-100` / Xác nhận `bg-blue-600` | khác hẳn `BulkAssignModal` (dùng `<Button>`) dù cùng chức năng |
| `SecuritySection.tsx:93-109` | Lưu / Đặt lại mặc định | `rounded-lg px-4 py-2` tự viết — các trang Settings khác dùng `<Button size="sm">` |
| `TicketDetailSheet.tsx:182-187` | "Đóng" full-width `bg-muted` | |
| `TaskListTable.tsx:123-153` | phân trang ‹ 1 2 3 › `bg-indigo-600` | indigo ≠ primary (blue 221°) |
| `DateRangeFilter.tsx:64-76`, `TaskListFilter.tsx:88-98` | segmented "Tháng/Quý/Tuỳ chọn" `bg-indigo-600` | 2 segmented control khác nhau cho cùng việc chọn kỳ |
| `smtp/page.tsx:24-30`, `DigestSection.tsx:125-129`, `NotificationSection.tsx:108-112` | tab pill `bg-muted p-1` | 3 bản copy-paste; cỡ chữ khác nhau (`text-sm` vs `text-xs`) |
| `DigestScheduleFields.tsx:97-110`, `OverdueReminderSection.tsx:169-175` | chip T2…CN | copy-paste 2 nơi; `text-white` cứng thay `primary-foreground` |
| `DrillDownModal.tsx:80`, `AssignHelpdeskModal.tsx:62-67`, `BulkAssignModal.tsx:46`, `TicketDetailSheet.tsx:75-80` | nút đóng modal | 2 dùng icon X, 2 dùng ký tự "×" `text-xl` |

### 2.3 Nút icon thiếu nhãn (không `aria-label`, nhiều nút không cả `title`)

| File:dòng | Nút |
|-----------|-----|
| `PrioritiesSection.tsx:85-86` | Sửa / Xóa (không title, không aria) |
| `TaskTypesSection.tsx:83-84` | Sửa / Xóa |
| `ReportTemplatesSection.tsx:210-216, 220-225` | Toggle trạng thái (icon ToggleRight), Sửa, Xóa |
| `ProfileAvatar.tsx:76-79` | Đổi ảnh (Camera) |
| `ProfileAvatar.tsx:93-97` | 10 ô màu (chỉ `title` = mã hex) |
| `ChangePasswordSection.tsx:76-83, 99-106, 122-129` | hiện/ẩn mật khẩu (`tabIndex=-1` → không tới được bằng bàn phím) |
| `SmtpAuthFields.tsx:48-54` | hiện/ẩn mật khẩu |
| `DrillDownModal.tsx:80`, `TicketDetailSheet.tsx:75` | đóng |
| `LogPagination.tsx:25-42` | ‹ › chỉ icon |
| `TaskRefTable.tsx:18` | Copy (chỉ `title="Copy"` tiếng Anh) |
| `PermissionsMatrix.tsx:97` | Back |

### 2.4 Vị trí nút "Lưu" — 5 kiểu

| Kiểu | Nơi | File:dòng |
|------|-----|-----------|
| A. Cuối trang, **chỉ hiện khi dirty**, không sticky, nhãn "Lưu thay đổi" + ghost "Hủy" | Digest, Notification, Overdue | `DigestSection.tsx:164-174`, `NotificationSection.tsx:126-135`, `OverdueReminderSection.tsx:285-292` |
| B. Cuối trang, **sticky bottom**, luôn hiện (disabled khi chưa đổi), có "Đặt lại mặc định" | Security | `SecuritySection.tsx:92-114` |
| C. Cuối form, luôn hiện, disabled khi !dirty, nhãn "Lưu cấu hình", nút Test cùng hàng `ml-auto` | SMTP | `SmtpSection.tsx:112-139` |
| D. Trong từng card, chỉ hiện khi dirty, icon **Pencil** cho nút Lưu (!) | Profile Basic | `ProfileBasicInfo.tsx:86-93` |
| E. Trong card, luôn hiện, nhãn "Lưu cài đặt"/"Lưu lịch"/"Lưu template" | General, Cron Helpdesk, Email template | `GeneralSection.tsx:93-98`, `CronPanel.tsx:118-120`, `EmailTemplateEditor.tsx:72-78` |
| F. **Không có nút Lưu** — lưu ngay khi click | Màu avatar, toggle template, PermissionsTable checkbox | `ProfileAvatar.tsx:59-62` (lỗi nuốt im lặng `catch {}`), `ReportTemplatesSection.tsx:148`, `PermissionsMatrixSection.tsx:23-39` |

Nhãn nút lưu: "Lưu thay đổi"×7, "Lưu"×3, "Lưu cấu hình", "Lưu cài đặt", "Lưu lịch", "Lưu template". Nhãn tạo mới: "Thêm" (Priorities, TaskTypes) vs "Thêm mẫu" vs "Tạo người dùng". Trạng thái loading: "Đang lưu..." vs "Đang xử lý..." vs "Đang lấy..." vs "Đang gán...".

**Đề xuất:**
- Một `<Button>` duy nhất: size `sm`(32) / `md`(36, mặc định cho trang admin) / `lg`(40) / `icon-sm`(28) / `icon`(32); variant `primary | secondary | outline | ghost | destructive | link`. `destructive` dùng cho mọi hành động xoá/reset (hiện 1/… chỗ).
- Settings: **Save bar sticky dưới** (mẫu B) cho mọi trang cấu hình nhiều field; luôn hiện, disabled khi chưa đổi, có nhãn trạng thái "Có thay đổi chưa lưu". CRUD dạng bảng dùng nút "+ Thêm …" ở góc phải header.
- Nhãn: "Lưu thay đổi" / "Hủy" / "Thêm <đối tượng>" / "Xóa" ; loading: "Đang lưu…".
- Nút icon bắt buộc `aria-label` + Tooltip.

---

## 3. Bo góc, padding, gap, chiều rộng

### 3.1 Bo góc

| Class | Số lần | Ví dụ |
|-------|-------:|-------|
| `rounded` (4px trần) | ~40 | badge TaskList (`TaskListTable.tsx:28-30,99`), badge Helpdesk (`StatusBadge.tsx:15,34`) |
| `rounded-md` | 27 | Table wrapper Settings/HR (`rounded-md border`) |
| `rounded-lg` | 70 | Table wrapper Helpdesk/Logs (`rounded-lg border`), input tự viết |
| `rounded-xl` | 37 | card Analytics, card Profile/Security/Digest, KpiCard, header icon |
| `rounded-2xl` | 2 | modal Helpdesk tự viết (`AssignHelpdeskModal.tsx:59`, `BulkAssignModal.tsx:40`) |
| `rounded-full` | 47 | badge pill, avatar, switch |

→ **Wrapper bảng: `rounded-md` (HR, Settings, PermissionsTable) vs `rounded-lg` (Helpdesk, Logs, PermissionsMatrix)**. Badge trạng thái: `rounded` (Analytics/Helpdesk), `rounded-full` (DrillDown, ProfileMeta, Notification), shadcn `Badge` (HR/Logs). Modal: Dialog `sm:rounded-lg` vs tự viết `rounded-xl`/`rounded-2xl`.

### 3.2 Padding card

| Padding | Nơi |
|---------|-----|
| `p-6` | card Analytics (`analytics/page.tsx:175,192,199…`), card Profile, SecurityCard, GeneralSection |
| `p-5` | ManualImportCard, SyncStatusCard |
| `p-4` | Digest/Overdue form card, PushToTasks, EmailTemplateEditor |
| `px-5 py-4` | HelpdeskAdminPanel toolbar, CronPanel |
| `px-4 py-3.5` / `px-4 pt-4 pb-3` | KpiCard / TaskListKpiCards (2 bản KPI card khác nhau) |
| `p-3` (76 lần) | ô chọn trong Digest/Notification/Overdue |

### 3.3 Gap / spacing dọc

`space-y-*` 129 lần với 4/5/6/8: trang Analytics/HR/Helpdesk `space-y-6`, Helpdesk list `space-y-5`, Logs section `space-y-4`, Profile `space-y-8`, Settings section `space-y-4` hoặc `space-y-6`. `gap-2`×94, `gap-3`×64, `gap-4`×11, `gap-6`×3; filter bar dùng `gap-2` (Helpdesk, Analytics) vs `gap-2.5` (Logs) vs `gap-3` (HR).

### 3.4 Chiều rộng control & form

| Chỉ số | Giá trị đo được |
|--------|-----------------|
| Ô search | `w-44` (TaskList `task-list/page.tsx:180`, Research `:63`), `w-56` (TaskRef `TaskRefFilters.tsx:38`), `flex-1 min-w-[200px] max-w-sm` (HR `:139`, Helpdesk `TicketFilterBar.tsx:22`), `w-44` "Tên task" Logs |
| Ô ngày | `w-36` (Analytics), `w-40` (Logs), `w-[145px]` (HR, Helpdesk) → **3 bề rộng cho cùng input date** |
| Select lọc | `w-[150px]/[160px]/[170px]/[180px]` (Helpdesk, HR), `w-48`/`w-52`/`w-40` (Logs), `min-w-[160px]` (Analytics native) |
| Chiều cao control | `h-7`×12, `h-8`×28, `h-9`×24, mặc định Input/Select `h-10`; native select `py-1.5` (~30px) |
| Form Settings | ChangePassword `max-w-sm` (`ChangePasswordSection.tsx:64`); General Select `max-w-sm`; Security cả trang `max-w-5xl`; Profile/Digest/SMTP **full width** không giới hạn → trên màn 1920px input SMTP host dài ~1200px |
| SecurityFormField | control cố định `w-32` bên phải (`SecurityFormField.tsx:29`) |

### 3.5 Modal width

| Modal | Width | Cách làm |
|-------|-------|----------|
| CreateUser / EditUser | `sm:max-w-[480px]` | Dialog |
| ChangePassword | `sm:max-w-[400px]` | Dialog |
| UserHistory | `sm:max-w-[560px] max-h-[80vh]` | Dialog |
| Priority / TaskType form | mặc định `max-w-lg` (512) | Dialog |
| ReportTemplate | `max-w-lg` (ghi lại trùng mặc định) | Dialog |
| AssignHelpdesk / BulkAssign | `max-w-md` (448) | **div tự viết** |
| DrillDown | `max-w-3xl max-h-[80vh]` | **div tự viết** |
| TicketDetailSheet | `max-w-lg` phải | **div tự viết**, có `ui/sheet.tsx` không dùng |

→ 6 bề rộng, 2 cơ chế. **Đề xuất** 3 size: `dialog/sm` 400, `dialog/md` 520, `dialog/lg` 720 (+ `sheet/md` 480). `components/ui/dialog.tsx:41` còn viết cứng `bg-white text-gray-900` → sai dark mode, cần đổi sang `bg-background text-foreground`.

### 3.6 Cột bảng / text bị cắt

| File:dòng | Hiện trạng | Rủi ro |
|-----------|-----------|--------|
| `HelpdeskTicketRow.tsx:62` | Tiêu đề `max-w-[200px] truncate` (có `title`) | ok nhưng 200px hẹp, 11 cột |
| `research/page.tsx:99` | `truncate max-w-[200px]` **không title** | không xem được tên đầy đủ |
| `TaskLogRow.tsx:65-66` | `max-w-[220px] truncate` không title | |
| `TaskRefTable.tsx:43` | `max-w-[220px] truncate` không title | |
| `ReportTemplatesSection.tsx:200` | `max-w-[200px] truncate` không title | |
| `TaskListTable.tsx:76-77` | `max-w-[240px] line-clamp-2` | ok |
| `UserLogRow.tsx:70` | Chi tiết `max-w-[200px]` không truncate → dòng cao | |
| `UserTable.tsx:266-272` | Email không truncate, không whitespace-nowrap | bảng giãn |
| `KpiCard.tsx:47`, `TaskListKpiCards.tsx:37` | title KPI `truncate` uppercase tracking-widest | trên grid 6 cột "ĐANG THỰC HIỆN" bị cắt |

---

## 4. Bảng

### 4.1 So sánh 12 bảng

| Bảng | Component | Header style | Wrapper | Cuộn ngang | Sort | Phân trang | Loading | Empty |
|------|-----------|--------------|---------|-----------|------|-----------|---------|-------|
| Performance (Analytics) | `<table>` thô | 11px uppercase màu theo cột + chấm | không border | ✓ | ✗ | ✗ (cắt 15 dòng `:67`) | ✗ | "Chưa có dữ liệu" |
| TaskList (Analytics) | `<table>` thô | 10px uppercase gray-500, `rounded-l-lg` trên `<th>` | trong card | ✓ | select riêng ngoài bảng (`page.tsx:184`) | số trang + ‹›, size 10/20/50/100 | skeleton 5 dòng | "Không có dữ liệu trong khoảng thời gian này" |
| Research overdue | `<table>` thô | `font-medium text-gray-500` không uppercase | card | ✓ | ✗ | ✗ | text "Đang tải..." | "🎉 Không có task nào quá hạn!" |
| DrillDown | `<table>` thô | xs semibold uppercase, **sticky** | modal | ✗ (ẩn cột theo breakpoint) | ✗ | ✗ (tối đa 100) | spinner | "Không có dữ liệu" |
| Helpdesk tickets | shadcn Table | xs semibold uppercase muted | `rounded-lg border` | ✓ | ✗ | Trước/Tiếp + Select 10/25/50/100, **luôn hiện** | spinner + text | Inbox icon |
| Users (HR) | shadcn Table | **mặc định shadcn** | `rounded-md border` | **✗** | ✗ | Trước/Tiếp, ẩn khi 1 trang, không chọn size | spinner border tự vẽ | ShieldCheck icon (sai ngữ nghĩa) |
| PermissionsTable | `<table>` thô 2 tầng | font-medium + xs uppercase | `rounded-md border` | ✓ | ✗ | ✗ | spinner | **không có** |
| Task log | shadcn | xs semibold uppercase | `rounded-lg` | ✓ | ✗ | icon ‹›, ẩn khi 1 trang | trong bảng | trong bảng |
| User log | shadcn | như trên | như trên | ✓ | ✗ | như trên | như trên | như trên |
| Task reference | shadcn | như trên | như trên | ✓ | ✗ | như trên | như trên | như trên |
| Priorities / TaskTypes | shadcn | mặc định | `rounded-md` | ✗ | ✗ | ✗ | "Đang tải..." trong row | **không có** (Priorities, TaskTypes) |
| ReportTemplates | shadcn | mặc định | `rounded-md` | ✗ | ✗ | ✗ | row | "Chưa có mẫu báo cáo nào" |

### 4.2 Filter bar — vị trí

| Trang | Vị trí |
|-------|--------|
| Analytics Tổng quan | **trong header phải**, cạnh nút Excel/PDF (`page.tsx:118-136`) |
| Analytics TaskList | 2 tầng: kỳ + NV ở header; search + sort **trong card bảng** (`page.tsx:163-200`) |
| Research | trong header card (`research/page.tsx:49-74`) |
| Helpdesk | hàng riêng dưới header section, nút "Xóa bộ lọc" ghost khi có lọc |
| HR | hàng riêng dưới header, có nút X chỉ cho cụm ngày |
| Logs | hàng riêng đầu section, **không có nút xoá lọc**, ô ngày không có nhãn (chỉ placeholder trình duyệt) |

Chọn hàng loạt: Helpdesk dùng `<input type=checkbox>` native, **không có "chọn tất cả"** ở header (`HelpdeskTicketTable.tsx:20` cột rỗng); HR dùng shadcn Checkbox có indeterminate. Thanh bulk: Helpdesk đặt nút ở header phải, HR hiện toolbar `bg-indigo-50/50` (`UserTable.tsx:160`) — 2 pattern.

**Đề xuất:** 1 component `DataTable` (shadcn Table) + `DataTableToolbar` (search trái, filter giữa, "Xóa bộ lọc", hành động phải) + `DataTablePagination` (tổng · size 10/20/50/100 · ‹ 1 2 3 ›, luôn hiện khi total>0) + `BulkActionBar` nổi. Header: `type/overline`. Wrapper `rounded-lg border overflow-x-auto`. Empty/Loading/Error chuẩn hoá trong `<TableBody>`.

---

## 5. Form

| Tiêu chí | Hiện trạng | File:dòng |
|----------|-----------|-----------|
| Label | Đa số label **trên**; Security dùng label **trái** + control phải `w-32` (`SecurityFormField.tsx:18-31`); Cron label trên `text-xs muted`; Smtp label `text-xs`; HR label mặc định `text-sm` → 3 cỡ label | |
| Label không gắn `htmlFor` | PriorityForm, TaskTypeForm, ReportTemplate, Profile*, Smtp*, Digest template dùng `<Label>`/`<label>` không `htmlFor` | `PriorityForm.tsx:27-40`, `DigestTemplateFields.tsx:33,45` |
| Required `*` | Có ở HR (`<Req/>`), ReportTemplate, ProfileBasic, ChangePasswordModal. **Không có** ở Priority (Tên bắt buộc — nút bị disable âm thầm), TaskType, ChangePasswordSection, SMTP host/port | `PriorityForm.tsx:27`, `TaskTypeForm.tsx:26`, `ChangePasswordSection.tsx:66-111` |
| Helper text | `text-xs` (HR, Digest) vs `text-[11px]` (Profile, EmailTemplate) | `ProfileContact.tsx:38,45`, `EmailTemplateEditor.tsx:43,57` |
| Hiển thị lỗi | HR: react-hook-form + zod, lỗi inline dưới field + `ServerError` box. Settings: **chỉ toast** (ChangePasswordSection `:23-30`), hoặc disable nút không giải thích (Priority, TaskType, ReportTemplate). Helpdesk import: dòng đỏ có emoji ⚠️/❌ | |
| Quy tắc mật khẩu mâu thuẫn | CreateUser min 8 (`CreateUserModal.tsx:24`), **EditUser min 6** (`EditUserModal.tsx:19`) nhưng placeholder chung "Tối thiểu 8 ký tự" (`UserPasswordFields.tsx:26`); ChangePasswordModal đọc policy động; ChangePasswordSection **cứng 8** (`:27,60`) trong khi Security cho cấu hình 6–32 (`SecurityPasswordCard.tsx:29-30`) | |
| Switch vs Checkbox | Bật/tắt tính năng: shadcn Switch (Cron, CreateUser), Switch tự viết (Digest, Notification, Overdue, Smtp ×2, Security), icon Toggle (ReportTemplate list), **checkbox** (ReportTemplate form "Kích hoạt" `:103`, Priority "Mặc định" `:45`). Chọn nhiều: shadcn Checkbox (PermissionsTable, UserTable), native checkbox `accent-primary` (Digest, Notification, Helpdesk, Priority), nút CheckSquare/Square (Overdue `:232`), ô vuông tự vẽ (DigestRecipients `:146-151`) | |
| Select | 13 `<select>` native (Analytics ×5, Digest/Overdue giờ-phút ×4, ProfileBasic timezone, Assign/Bulk modal) cạnh shadcn Select 112 | `ProfileBasicInfo.tsx:72` (2 danh sách timezone khác nhau: 5 mục ở Profile vs 16 mục ở General `GeneralSection.tsx:10-27`) |
| Input tự viết | DigestTemplateFields `input/textarea` thô (`:34,46,58`), ManualImport textarea, ProfileBasic textarea, EmailTemplate textarea — có `components/ui/textarea.tsx` chỉ ReportTemplate dùng | |
| Number input | Cron dùng `<Input type=number w-20>`; Security dùng `NumberInput` tự viết `text-right` (`SecurityControls.tsx:47-57`); Priority level `max=10` nhưng label ghi "1=Thấp → 4=Khẩn cấp" (`PriorityForm.tsx:40-41`) | |

**Đề xuất:** `FormField` chuẩn (label trên, 14/500, `*` đỏ, helper 12 muted, lỗi 12 destructive có icon) + biến thể `FormRow` (label trái 40% / control phải) chỉ cho trang cấu hình dạng "setting row". Quy tắc: **Switch = bật/tắt có hiệu lực tức thì hoặc trạng thái tính năng; Checkbox = chọn mục trong danh sách**. Một `TimeOfDayPicker`, một `WeekdayPicker`, một `PasswordInput` (nút mắt có aria), một `PasswordPolicyHint` đọc policy từ server cho cả 3 form mật khẩu.

---

## 6. Màu viết cứng & chart

### 6.1 Số liệu

| Chỉ số | Số lần |
|--------|-------:|
| `text-{red,green,blue,…}-NNN` | 515 |
| `bg-{…}-NNN` | 298 |
| `dark:` thủ công | 389 |
| mã hex `#RRGGBB` | 47 |
| `var(--chart-*)` | **0** |
| `hsl(` | 0 |

### 6.2 Điểm nóng

| File | Vấn đề |
|------|--------|
| `analytics/page.tsx`, `task-list/page.tsx`, `research/page.tsx` | toàn bộ card `bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800`; vùng capture `bg-gray-50 dark:bg-gray-950 p-1` (`page.tsx:140`) |
| `KpiCard.tsx:20-27`, `TaskListKpiCards.tsx:11-18` | 6 theme màu × 5 thuộc tính; "orange" thực ra là amber; "Đang thực hiện" xanh indigo ở TaskList nhưng **amber** ở FunnelChart/TaskListTable → cùng trạng thái 2 màu |
| `DrillDownModal.tsx:19-26`, `TaskListTable.tsx:17-25`, `StatusBadge.tsx`, `TaskLogRow.tsx:9-37`, `NotificationItem.tsx:28-43` | **5 bảng map trạng thái → màu riêng**, không thống nhất: IN_PROGRESS = blue (DrillDown) / amber (TaskList) / indigo (KPI); COMPLETED = emerald / green |
| `TaskLogRow.tsx:9-13` | badge nền đặc `bg-green-500 text-white`… — khác mọi badge khác (nền nhạt) |
| `UserTable.tsx:263` | fallback avatar `#3B82F6` inline; `DigestRecipientsFields.tsx:31` fallback `#6366f1` — 2 màu fallback |
| `NotificationBell.tsx:35,49-51` | `ring-white`, `dark:bg-[#18181b]`, shadow arbitrary 3 lớp |
| `HelpdeskAdminPanel.tsx:77`, `SyncHistorySection.tsx:68-69`, `UserLogRow.tsx:23-27,97` | badge `bg-green-100 text-green-700` **không có `dark:`** → chói trong dark mode |
| Primary drift | `bg-indigo-600` (Analytics segmented, phân trang), `bg-blue-600` (Helpdesk nút), `text-indigo-500` mã task; primary token là blue 221° |

### 6.3 Chart

| Chart | Màu | Lưới/trục | Tooltip | Empty height |
|-------|-----|-----------|---------|--------------|
| MonthlyOverview | `#6366f1`, `#10b981`, line `#f59e0b` | grid `#f0f0f0`, tick 11, không màu tick | radius 8, font 13 | 320 |
| FlowDonut | `#f59e0b`, `#8b5cf6`, label `#fff` | — | border `#e5e7eb` font 12 | 180 |
| TaskTypeTime | màu DB, fallback `#6366f1` | `#f0f0f0` | font 13 | 280 |
| Funnel (div) | Tailwind `bg-indigo/blue/amber/violet/emerald-500` | — | — | 260 |
| Workload (chết khỏi menu) | 9 hex | — | border `#e5e7eb` | 280 |
| OnTimeByUser (chết) | 3 ngưỡng hex | `#e5e7eb`, tick `#9ca3af` | | 260 |
| Trend (chết) | `#3b82f6`, `#10b981` | `#f0f0f0` | | 300 |

→ Font tooltip 12 vs 13, viền tooltip có/không, lưới `#f0f0f0` vs `#e5e7eb`; dark mode: lưới và tooltip nền trắng không đổi.

**Đề xuất:** palette chart = `--chart-1..8` (định nghĩa lại cho phù hợp trạng thái), 1 file `chartTheme.ts` (grid `hsl(var(--border))`, tick `hsl(var(--muted-foreground))` 11px, tooltip `bg-popover border-border radius-md 12px`). Một nguồn duy nhất `STATUS_TOKENS` (label + màu) dùng cho badge, funnel, KPI, chart, email.

---

## 7. Text tiếng Việt

| Loại | Chi tiết | File:dòng |
|------|---------|-----------|
| Lỗi chính tả | "Ư u tiên" (dấu cách giữa) | `HelpdeskTicketTable.tsx:20` |
| Sai nghĩa | `REVIEW_APPROVED` → "Chờ Review" (đã duyệt mà ghi chờ) | `TaskLogRow.tsx:32`, `TaskLogFilters.tsx:22` |
| Dấu không nhất quán | Hủy×19 / Huỷ×4; Xóa×15 / Xoá×6; Tùy×2 / Tuỳ×2 | ví dụ `TaskLogFilters.tsx:14-15` "Huỷ/Xoá", `UserLogFilters.tsx:20` "Xoá người dùng" vs HR "Xóa" |
| Viết tắt khó hiểu | "Đang TH" (`PerformanceTable.tsx:16`), "Bắt buộc đổi MK" (`UserTable.tsx:176`), "Đặt lại MK" (`UserLogRow.tsx:15`), "QL/NV" (`NotificationTypeList.tsx:61`), "TB" (`analytics/page.tsx:200`), "{n}d" (`TaskListTable.tsx:92`) | |
| Anh-Việt lẫn | "Task"×211 vs "công việc"×24 cùng màn: KPI "Tổng Công Việc" nhưng tiêu đề "Danh Sách Task", bảng "Tên task"; "Get từ API", "Reset dữ liệu", "fetched", "Unknown", "External", "Provider / ISP", "Preview HTML", "Sub-features", "Metadata", "Lưu template", "Test", "req/min", "Research & Bottlenecks", "Funnel Xử Lý Công Việc", "Biểu đồ Flow", "Assignees", "Deadline" | `SyncHistorySection.tsx:82`, `UserLogRow.tsx:55,98`, `UserLogTable.tsx:12`, `PermissionsMatrixSection.tsx:59` |
| Viết hoa không nhất quán | Title Case kiểu Anh: "Tổng Công Việc", "Hoàn Thành", "Đang Thực Hiện", "Chờ Review", "Quá Hạn", "Gia Hạn", "Tổng Quan Theo Tháng", "Hiệu Suất Nhân Viên", "Danh Sách Task", "Phân Bố Workload Hiện Tại" — các khu khác viết hoa chữ đầu câu | `analytics/page.tsx:151-177,193`, `task-list/page.tsx:123` |
| Chữ hoa kỹ thuật lộ ra UI | "PUSHED — đã tạo Task", "UNASSIGNED — chờ xử lý" (`TicketDetailSheet.tsx:171`), `log.performedBy.role.name` = "ADMIN" thô (`TaskLogRow.tsx:88`), oldStatus→newStatus mã enum (`TaskLogRow.tsx:78-80`), `task.status` enum thô trong Research (`research/page.tsx:112`), action key rbac `font-mono` | |
| Emoji trong UI | 34 lần: 🎉 📋 ⏳ 📥 🔄 🔐 💡 ⚠️ ❌ 🚨 🏢 🌐 📝 🔍 📬 + cờ quốc gia | `research/page.tsx:81`, `ManualImportCard.tsx:60,71-81,99,104,118-119`, `UserLogFilters.tsx:26-27,45`, `OverdueReminderSection.tsx:25-28`, `DigestRecipientsFields.tsx:162`, `analytics/page.tsx:169` |
| Toast mơ hồ | "Đã cập nhật" ×3 (không nói cái gì), "Đã xóa", "Lỗi kết nối" ×2, "Lỗi khi lưu", "Lỗi upload", "Reset thất bại"; "Đã xóa {n} task và {n} pending" (`HelpdeskAdminPanel.tsx:45`); xoá Priority/TaskType thành công **không có toast** (`PrioritiesSection.tsx:44`, `TaskTypesSection.tsx:44`) | |
| Thông điệp sai | Empty Users dùng icon `ShieldCheck` (`UserTable.tsx:136`); "Get từ API (giả lập auto-fetch)" (`SyncStatusCard.tsx:16`) | |
| Empty state không đồng nhất | "Chưa có dữ liệu"×7 vs "Không có dữ liệu"×7 vs "Không có ticket nào trong danh sách" vs "Không tìm thấy người dùng nào" vs "🎉 Không có task nào quá hạn!" vs "Không có ai đang có task active" | |
| File xuất | tên file không dấu "Thang-…"/"Nam-…"/"tat-ca" (`task-list/page.tsx:28-36`) — chấp nhận được nhưng nên ghi rõ quy ước | |

**Đề xuất:** từ điển thuật ngữ (glossary) chốt: Task → "công việc" ở tiêu đề/nhãn, giữ "Task" chỉ trong mã (TaskCode); "Hủy/Xóa/Tùy" (dấu cũ, thống nhất với phần còn lại của app); sentence case cho mọi tiêu đề; cấm emoji trong UI (thay lucide icon); toast theo mẫu "Đã <động từ> <đối tượng>" / "Không thể <động từ> <đối tượng>: <lý do>".

---

## 8. Loading / Empty / Error theo màn hình

| Màn hình | Loading | Empty | Error | window.confirm |
|----------|---------|-------|-------|----------------|
| Analytics Tổng quan | skeleton KPI (grid-cols-3 khi loading → 2 khi xong, nhảy layout `page.tsx:144` vs `:150`); chart **không có loading** | mỗi chart "Chưa có dữ liệu" (chiều cao 180–320 khác nhau) | **không** (query lỗi → trống im) | — |
| Analytics TaskList | skeleton 5 dòng | text | **không** | — |
| Research | "Đang tải..." text gray-400 | emoji | **không** | — |
| DrillDown | spinner | text | "Không thể tải dữ liệu" đỏ | — |
| Helpdesk | spinner+text | Inbox | AdminPanel có lỗi sync; **TicketList không có error** | — |
| HR Users | spinner tự vẽ (border) | ShieldCheck | box destructive ✓ | — |
| HR Permissions | spinner tự vẽ | **không** | box destructive ✓ | — |
| Logs ×3 | trong bảng | Inbox | **không** (`isError` không đọc) | — |
| Settings Priorities/TaskTypes | text trong row | **không** | **không** | **có** |
| Settings ReportTemplates | text | ✓ | **không** | **có** |
| Settings Digest/Notif/Overdue/Smtp/Security/Profile | spinner Loader2 (h-5 vs h-6 Security) | — | **không** (lỗi load → form mặc định, có thể ghi đè cấu hình!) | — |
| Settings General | "Đang tải..." text | — | fetch lỗi → im lặng | — |
| Notification dropdown | spinner tự vẽ | icon + 2 dòng ✓ | **không** | — |

→ Tổng `isError` chỉ xuất hiện **5 lần** trên toàn phạm vi. 3 kiểu spinner: `Loader2`, `div border-t-transparent` (HR), emoji ⏳.

**Đề xuất:** `<LoadingState variant="table|card|page">` (skeleton), `<EmptyState icon title desc action>`, `<ErrorState onRetry>`; form cấu hình **không render khi load lỗi**.

---

## 9. Responsive

| Vấn đề | File:dòng |
|--------|-----------|
| Bảng Users **không `overflow-x-auto`** (9 cột) → tràn ngang trên mobile | `UserTable.tsx:205` |
| Bảng Priorities/TaskTypes/ReportTemplates không cuộn ngang | `PrioritiesSection.tsx:61`, `TaskTypesSection.tsx:61`, `ReportTemplatesSection.tsx:178` |
| Header HR `flex justify-between` không wrap → nút "Xuất CSV" + "Tạo người dùng" chèn tiêu đề | `hr/users/page.tsx:92` |
| Toolbar Helpdesk list: các nút bulk + Xuất Excel không wrap | `TicketListSection.tsx:115` |
| Grid form **cố định không breakpoint**: `grid-cols-2` (SmtpAuth `:25`, SmtpSender `:20`, PriorityForm `:25,38`, ReportTemplate `:73`, DigestSchedule `:53`), `grid-cols-3` (SmtpServer `:22`) | |
| SecurityFormField: text trái `flex-1` + control `w-32` cố định → trên 360px text bị bóp còn ~150px | `SecurityFormField.tsx:18-31` |
| SMTP action row: Select `w-56` + nút Test `ml-auto` cạnh Save — tràn dưới 400px | `SmtpSection.tsx:112-138` |
| Notification dropdown `w-[400px]` cố định > màn 360/375 | `NotificationBell.tsx:48` |
| Chip ngày T2…CN `flex-1 h-9` 7 nút trong card p-4 → ~38px/nút ở 360px, chữ xs vẫn đọc được nhưng sát | `DigestScheduleFields.tsx:95`, `OverdueReminderSection.tsx:167` |
| LogsNav ẩn nhãn dưới `sm` (chỉ còn icon) — ok, nhưng không có tooltip | `LogsNav.tsx:66-67` |
| PermissionsTable nhiều cột, cột "Nhân viên" **không sticky** (trong khi PermissionsMatrix rbac có sticky) | `PermissionsTable.tsx:35,61` |
| KPI title uppercase `tracking-widest truncate` ở `grid-cols-2` mobile bị cắt | `KpiCard.tsx:47` |
| Không có "layout 2 cột Settings": Settings dùng **sidebar toàn cục** làm nav (không có SettingsNav trong trang) → trên mobile phải mở drawer sidebar để chuyển tab Cài đặt | `settings/layout.tsx`, `shared/layout/sidebar/config.ts:72-105` |

---

## 10. Vị trí: breadcrumb, nav con, header, code chết

| Hạng mục | Hiện trạng |
|----------|-----------|
| Breadcrumb | **Không có ở đâu** (grep `breadcrumb` = 0) |
| Nav con Settings | Không có SettingsNav trong trang; nằm trong sidebar (`SETTINGS_SYSTEM_ITEMS` + 4 item lẻ + `SETTINGS_ADMIN_ITEMS`). Nhãn sidebar "Profile" (Anh) vs H2 trong trang "Profile"; "SMTP Email" vs H2 "Cấu hình Email (SMTP)". `/settings/general` **không có trong menu** (route mồ côi). `/settings/smtp` có tab con tự viết (`smtp/page.tsx:22`) — 1 trang Settings duy nhất có tab. |
| Nav con Logs | Tab gạch chân `border-b-2` trong layout (`LogsNav.tsx`) — **pattern tab thứ 2** (khác tab pill của SMTP/Digest/Notification) |
| Nav con Analytics | Sidebar `AnalyticsMenu.tsx:13-14` ("Tổng quan", "Danh sách Task"); **`/analytics/research` mồ côi** (không link nào trỏ tới) |
| Nav con HR Permissions | 5 route `/hr/permissions/{logs,users,analytics,helpdesk,settings}` qua sidebar, nhãn Anh "Logs/Analytics/Helpdesk/Settings"; trang nào cũng in lại cùng H1 "Phân quyền Sidebar" → không biết đang ở tab nào |
| Header trang | 3 pattern: (a) layout chung có icon box + border-b (Logs, Settings), (b) H1 trong page + nút phải (HR, Analytics), (c) H1 trơn (Helpdesk) rồi section con có H2 to gần bằng |
| Nút hành động chính | HR: phải header; Settings CRUD: phải header section; Helpdesk: Get API nằm **trong card toolbar** chứ không ở header; Analytics: Excel/PDF phải header |

### Code chết (không được import) — cần quyết định trước khi preview

| Component | Ghi chú |
|-----------|---------|
| `helpdesk/sections/ImportSection.tsx` + `components/import/ManualImportCard.tsx` | **"Import tay" không còn hiển thị ở đâu** |
| `helpdesk/components/sync/SyncStatusCard.tsx` | thay bởi AdminPanel |
| `helpdesk/sections/PushToTasksSection.tsx` | |
| `settings/components/SettingsClient.tsx` | |
| `analytics/components/TrendChart.tsx`, `OnTimeByUserChart.tsx` | |
| `logs/components/TaskTimeline.tsx`, `TaskAuditLogTable.tsx`, `UserActivityLogTable.tsx` | |
| `rbac/components/PermissionsMatrix.tsx` (+ PermissionCellButton) | route `hr/users/[id]/permissions` trả `notFound()` |

---

## 11. Đề xuất tổng — component DS v2 cần có cho khu Admin

1. `PageHeader` (title, description, icon tuỳ chọn, actions, breadcrumb, tabs slot)
2. `SectionHeader` (title 16/600, description, actions)
3. `Card` (padding 20/24 chuẩn, `rounded-xl`, header/footer slot) + `StatCard` (gộp KpiCard + TaskListKpiCards)
4. `DataTable` + `Toolbar` + `Pagination` + `BulkActionBar` + `EmptyState`/`LoadingState`/`ErrorState`
5. `Tabs` 2 biến thể: `underline` (nav trang con: Logs, HR Permissions, Settings) và `segmented` (lọc trong trang: SMTP, Digest, Notification, kỳ Analytics)
6. `FormField` / `FormRow` / `SettingsSaveBar` (sticky)
7. `Switch`, `Checkbox`, `CheckboxCard` (ô chọn có mô tả – Digest/Notification/Overdue), `WeekdayPicker`, `TimePicker`, `DateRangePicker` (gộp DateRangeFilter + TaskListFilter + cặp input date HR/Helpdesk/Logs)
8. `StatusBadge` 1 nguồn (task status, helpdesk status, priority, role, log action, IP type)
9. `Dialog` 3 size + `Sheet` + `ConfirmDialog` (thay 3 `confirm()`)
10. `chartTheme` + palette `--chart-*` light/dark

---

## 12. DANH SÁCH MÀN HÌNH + TRẠNG THÁI CẦN PREVIEW

Ký hiệu trạng thái: **D** = có dữ liệu (mặc định) · **L** = loading · **E** = empty · **X** = lỗi tải · **M** = mobile 375px · **K** = dark mode · thêm trạng thái riêng ghi rõ.

### A. Analytics
| # | Màn hình | Trạng thái cần preview |
|---|----------|------------------------|
| A1 | Tổng quan `/analytics` (KPI ×6, chart tháng, bảng hiệu suất, 3 chart nhỏ) | D, L (skeleton KPI + chart), E (kỳ không có dữ liệu), X, M, K, đang xuất PDF |
| A2 | Bộ lọc kỳ (Tháng/Quý/Tuỳ chọn + chọn năm) | mặc định, tuỳ chọn mở 2 ô ngày |
| A3 | DrillDown modal (click KPI) | D, L, E, X, ≥100 dòng, M |
| A4 | Danh sách công việc `/analytics/task-list` | D, L, E, lọc theo 1 NV (ẩn cột NV), tìm kiếm, phân trang trang giữa, M |
| A5 | Research `/analytics/research` (quyết định giữ/bỏ vì mồ côi) | D, E, L |

### B. Helpdesk
| # | Màn hình | Trạng thái |
|---|----------|-----------|
| B1 | Trang Helpdesk (Admin) — toolbar Get API / Lịch tự động / Reset | idle, đang lấy, kết quả thành công, kết quả có lỗi, lỗi sync |
| B2 | Panel lịch tự động (Cron) mở | slot 2 tắt, cả 2 bật, đang lưu, đã áp dụng, lỗi |
| B3 | Reset dữ liệu bằng OTP | bước nhập OTP, đang xoá |
| B4 | Lịch sử đồng bộ (collapsible) | thu gọn, mở có dữ liệu, mở có lỗi chi tiết, rỗng |
| B5 | Danh sách ticket + filter | D, L, E, có filter đang bật, chọn nhiều (bulk bar), dòng "đã tạo Task", dòng "cần chú ý" (đỏ), M, K |
| B6 | Modal Gán IT Support | đang tải user, đã chọn, đang gán |
| B7 | Modal Gán hàng loạt | như B6 |
| B8 | Sheet chi tiết ticket | ticket chờ, ticket đã tạo Task, có/không diễn giải, M |
| B9 | Confirm xoá 1 / xoá nhiều | — |
| B10 | Import tay JSON (nếu giữ) | trống, JSON sai, đang nhập, kết quả |
| B11 | Trang Helpdesk góc nhìn Nhân viên (không có Admin panel) | D |

### C. HR — Quản lý người dùng
| # | Màn hình | Trạng thái |
|---|----------|-----------|
| C1 | Danh sách người dùng `/hr/users` | D, L, E (không khớp lọc), X, chọn nhiều (bulk toolbar), user bị vô hiệu (mờ), góc nhìn Employee (ẩn checkbox), M, K |
| C2 | Menu hành động dòng (⋯) | Admin với user khác, với chính mình, user đã vô hiệu |
| C3 | Modal Tạo người dùng | đặt mật khẩu tay, gửi link thiết lập, lỗi validate, lỗi server |
| C4 | Modal Sửa người dùng | có/không đổi vai trò, nhập mật khẩu mới (hiện ô xác nhận) |
| C5 | Modal Đổi mật khẩu (Admin đặt cho user) | checklist policy đạt/chưa đạt |
| C6 | Modal Lịch sử hoạt động user | D, L, E, phân trang |
| C7 | Confirm xoá user / confirm hành động chung (gửi link reset, đổi vai trò hàng loạt, bắt buộc đổi MK) | — |

### D. HR — Phân quyền
| # | Màn hình | Trạng thái |
|---|----------|-----------|
| D1 | Ma trận phân quyền Sidebar (tất cả menu) | D, L, X, đang lưu, dòng Admin/Boss khoá, menu tắt → feature disable, M (cuộn ngang + cột tên sticky) |
| D2 | Ma trận lọc theo 1 menu (Logs / Nhân viên / Analytics / Helpdesk / Settings) | D — cần thể hiện tab đang chọn |
| D3 | (Tuỳ quyết định) Ma trận override quyền task theo user (rbac PermissionsMatrix) | default/GRANT/REVOKE/khoá Force Mode, legend |

### E. Logs
| # | Màn hình | Trạng thái |
|---|----------|-----------|
| E1 | Header Audit Logs + nav con (3 tab) | tab active, M (chỉ icon) |
| E2 | Task Activity | D, L, E, X, filter đầy đủ, phân trang, M |
| E3 | User Activity | D (có dòng Unknown/đăng nhập thất bại, IP nội bộ/ngoài), L, E, X, M |
| E4 | Task Reference | D, L, E, đã copy ID |

### F. Settings
| # | Màn hình | Trạng thái |
|---|----------|-----------|
| F0 | Khung Settings (header + nav con đề xuất mới) | desktop, M |
| F1 | Mức ưu tiên — bảng + modal thêm/sửa + confirm xoá | D, L, E, lỗi "đang được sử dụng" |
| F2 | Loại công việc — bảng + modal (IconPicker) + confirm xoá | D, L, E |
| F3 | Mẫu hoàn thành — bảng + modal + toggle trạng thái | D, L, E |
| F4 | Thông báo (email prefs) | Admin bật/tắt master, tab Tất cả/Quản lý/Nhân viên, Employee read-only, có thay đổi chưa lưu |
| F5 | Báo cáo định kỳ (Digest) — tab Lịch gửi / Nội dung / Mẫu email | tắt, bật hợp lệ, cảnh báo thiếu lịch, cảnh báo thiếu nội dung, chọn người nhận (tìm kiếm, chọn tất cả), gửi thử, dirty |
| F6 | Nhắc nhở quá hạn | tắt, bật, chọn ngày/giờ, chặn bỏ chọn mục cuối, dirty |
| F7 | SMTP — tab Cấu hình | chưa cấu hình, đã cấu hình, đang test, test lỗi, M |
| F8 | SMTP — tab Mẫu email (accordion + editor + preview HTML) | danh sách, 1 mục mở, mẫu mặc định |
| F9 | Bảo mật (Rate limit / Mật khẩu / Phiên) | D, có thay đổi chưa lưu (save bar sticky), đang lưu, đặt lại mặc định, M |
| F10 | Cài đặt chung (múi giờ) — quyết định đưa vào menu hay bỏ | D, đang lưu |
| F11 | Profile — thông tin tài khoản, ảnh đại diện (upload, chọn màu), thông tin cơ bản, liên hệ | D, L, X, đang upload, file sai định dạng/quá lớn, dirty từng card, M |
| F12 | Đổi mật khẩu (trong Profile) | trống, không khớp, policy chưa đạt, đang xử lý |

### G. Thành phần dùng chung khu Admin
| # | Thành phần | Trạng thái |
|---|-----------|-----------|
| G1 | Chuông + dropdown thông báo | có chưa đọc (badge 99+), rỗng, loading, nhóm Hôm nay/Hôm qua/Cũ hơn, M (rộng ≤ màn hình) |
| G2 | Toast mẫu | thành công, lỗi, cảnh báo |
| G3 | Bảng chuẩn (DataTable) | header, hover, selected, empty, loading skeleton, error + retry, phân trang |
| G4 | Form field chuẩn | mặc định, focus, lỗi, disabled, required, helper |
| G5 | Switch / Checkbox / CheckboxCard / Segmented / Tabs underline | tất cả trạng thái |
| G6 | StatusBadge toàn bộ bảng màu trạng thái | light + dark |
| G7 | Chart theme (bar, line, donut, funnel) | light + dark, empty |

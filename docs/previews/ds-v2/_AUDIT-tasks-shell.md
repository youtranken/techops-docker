# AUDIT UI — Khung app + Tasks + Dashboard + Auth (chuẩn bị Design System v2)

> Phạm vi: `src/app/(dashboard)` (layout, `/`, `/tasks`, `/tasks/[id]`), `src/app/(auth)/*`, `src/shared/*`, `src/modules/tasks/*`, `src/modules/dashboard/*`, `src/modules/notifications/*`, `src/modules/auth/*`, `src/components/ui/*`.
> Chỉ đọc code, không sửa. Ngày audit: 22/10/2026. Số liệu đếm bằng grep trên phạm vi trên (không tính analytics/hr/settings/helpdesk/logs).
> Ký hiệu mức độ: **P0** = lỗi hiển thị/nghiệp vụ thấy ngay · **P1** = lệch chuẩn rõ, nên sửa khi làm DS · **P2** = vệ sinh/nhất quán.

---

## 0. Tóm tắt nhanh

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Lớp màu viết cứng (`text/bg/border-{palette}-{n}`) | ~1.700 | so với **117** lần dùng token (`bg-primary`, `text-muted-foreground`...) |
| Hai bảng xám song song | `slate-*` 695 lần · `gray-*` 355 lần · `stone-*` 7 | Tasks dùng slate, Dashboard/Shell dùng gray, Login dùng stone |
| Màu nhấn "thương hiệu" | `indigo-*` 286 · `blue-*` 56 · token `primary` (= blue-600) | Nút chính lúc indigo-600, lúc primary (blue) |
| Cỡ chữ tuỳ ý `text-[Npx]` | **116** lần (`[10px]` 55, `[11px]` 45, `[9px]` 8, `[13px]` 2, `[12px]` 2, `[14px]`, `[15px]`, `[28px]`, `[0.8em]`) | so với `text-xs` 128, `text-sm` 161 |
| `<Button>` (primitive) vs `<button>` tự viết | 48 vs 48 | một nửa số nút không qua design system |
| `aria-label` | **3** lần trong toàn phạm vi | `title=` 42 lần (thay tooltip) |
| Chiều rộng modal/sheet khác nhau | 7 giá trị (`max-w-sm`, `440px`, `480px`, `520px`, `max-w-lg`, `760px`, `800px`) | |
| Định nghĩa nhãn/màu trạng thái task | **≥ 8 nơi** | lệch cả nhãn lẫn màu (mục 3.2) |
| Primitive shadcn có sẵn | 15 (button, badge, dialog, alert-dialog, sheet, select, input, textarea, table, checkbox, switch, label, avatar, dropdown, separator) | **Thiếu**: card, tooltip, tabs, skeleton, popover, scroll-area, toggle-group, empty-state |

### Top 10 phát hiện quan trọng nhất
1. **P0 – Màu hạn chót bị đảo**: còn ≤3 ngày tô **xanh lá**, còn 4–7 ngày tô **vàng** (`TaskCard/taskRowCard.utils.ts:43`). Hạn càng gần càng "an toàn" về màu.
2. **P0 – Trang chi tiết task vỡ trên mobile/tablet**: cột phải cố định `w-96` + layout `flex` ngang không breakpoint (`TaskDetail/TaskDetailClient.tsx:32,56`), bên trái lại chia tiếp 60/40 (`DetailTabPanel.tsx`). Sheet Tạo/Sửa cũng vậy: cột phải `w-[300px]` cố định (`CreateTask/CreateTaskRight.tsx:37`) → trên 375px cột nội dung còn ~75px.
3. **P0 – Nút "+" Thêm file trong chi tiết task không làm gì** (không có `onClick`) — `TaskDetail/DetailTaskAttachments.tsx:32-37`.
4. **P0 – Trạng thái task: 8 bảng định nghĩa, nhãn và màu mâu thuẫn**: `IN_PROGRESS` là amber (badge), blue (Dashboard "Cần xử lý"), orange (donut); `PENDING_REVIEW` là "Chờ Review"/"Chờ review"/"Chờ nghiệm thu", violet hay blue; `DRAFT` là "Nháp" hay "Draft"; "Đã Hủy/Đã hủy/Đã huỷ".
5. **P0 – Modal Huỷ công việc**: tiêu đề "Hủy công việc", nút đỏ "Hủy công việc", nút đóng cũng là "Hủy" (`TaskActionPanel.tsx:134-138`). Người dùng dễ bấm nhầm.
6. **P1 – Footer modal hành động đảo thứ tự & lệch khoảng cách**: tất cả modal workflow đặt nút **chính trước, Hủy sau** và override `DialogFooter` bằng `flex-col` → desktop thành 2 nút 50/50 với gap đôi (gap-2 + space-x-2); trong khi sheet Tạo/Sửa đặt **Hủy trái – Chính phải**. Màu nút chính mỗi modal một kiểu (indigo/green/emerald/amber/red), modal "success" lại tô indigo.
7. **P1 – Không có lớp token thật**: `Dialog`/`Sheet` primitive viết cứng `bg-white text-gray-900` (không dark) nên **12 component** phải tự vá `dark:bg-slate-900`; chart dùng hex cứng (#f3f4f6 grid, tooltip nền trắng) → dark mode vỡ; không có token success/warning/info, không map `--chart-*`, không có font chữ được khai báo (dùng system font).
8. **P1 – Animation Radix không chạy**: dùng `animate-in/fade-in/zoom-in/slide-in-*` (dialog, sheet, dropdown, select, Detail*) nhưng Tailwind v4 không nạp plugin (`globals.css` không có `@plugin "tailwindcss-animate"`, không có `tailwind.config.ts` dù `components.json` trỏ tới).
9. **P1 – Thiếu a11y & thao tác cảm ứng**: chỉ 3 `aria-label`; nút icon-only không nhãn (kebab menu thẻ, đóng QuickView, phân trang ‹ ›, xoá file, rút gia hạn, hiện/ẩn mật khẩu). Nút Xem/Tải file, Sửa/Xoá bình luận, ★ trên thẻ chỉ hiện khi **hover** (`opacity-0 group-hover`) → không dùng được trên touch.
10. **P1 – Thuật ngữ & ngôn ngữ lẫn lộn**: "Tasks/Công việc/Nhiệm vụ/task"; hạn chót gọi là "Hoàn thành"/"Ngày hoàn thành"/"Hạn hoàn thành"/"Deadline"; menu tiếng Anh "Dashboard, Tasks, Logs, Analytics, HR, Settings, Profile", nhãn "IT Support", "Force", "Unknown", `sr-only "Close"`; lỗi server tiếng Anh đổ thẳng ra toast (`toast.error(err.message)` ×20: "Insufficient permissions", "Too many requests…").

---

## 1. Nền tảng (tokens, font, primitives)

| # | Phát hiện | File:dòng | Đề xuất |
|---|---|---|---|
| 1.1 | Token shadcn chuẩn (HSL) có, nhưng chỉ map màu; **không có** `--color-success/warning/info`, không map `--chart-1..5` vào `@theme` | `src/app/globals.css:5-26, 50-54` | Bổ sung semantic tokens: `success, warning, info, danger` + `*-foreground` + `*-subtle` (nền nhạt) + `--chart-*`; cấm dùng palette thô ở component |
| 1.2 | `@theme inline { --radius: var(--radius) }` tự tham chiếu, và Tailwind v4 dùng `--radius-sm/md/lg/xl` → `--radius: 0.5rem` **không ảnh hưởng** `rounded-*` | `globals.css:25, 49` | Khai báo `--radius-sm/md/lg/xl` từ 1 biến gốc |
| 1.3 | Không khai báo font (không `next/font`, không `--font-sans`) → Windows hiển thị Segoe UI, macOS SF, Linux khác | `src/app/layout.tsx:23`, `globals.css` | Chọn 1 font hỗ trợ tiếng Việt tốt (Inter/Be Vietnam Pro) qua `next/font`, khai `--font-sans`, `--font-mono` |
| 1.4 | Animation `animate-in/fade-in-0/zoom-in-95/slide-in-from-*` không được generate (thiếu `@plugin "tailwindcss-animate"` hoặc `tw-animate-css`); `components.json` trỏ `tailwind.config.ts` không tồn tại | `globals.css:1`, `components.json`, `package.json` (`tailwindcss-animate ^1.0.7`) | Thêm `@import "tw-animate-css"` (chuẩn v4) hoặc `@plugin`; cập nhật components.json |
| 1.5 | `DialogContent` & `SheetContent` viết cứng `bg-white text-gray-900`, AlertDialog lại dùng `bg-background` → 3 primitive cùng họ, 2 cách | `components/ui/dialog.tsx:41`, `sheet.tsx:34`, `alert-dialog.tsx:39` | Đổi về `bg-background text-foreground`; bỏ vá `dark:bg-slate-900` ở 12 consumer |
| 1.6 | Dialog close button `sr-only "Close"` tiếng Anh, `rounded-sm`, không đổi được | `dialog.tsx:47-50` | "Đóng", dùng `Button size=icon variant=ghost` |
| 1.7 | Sheet primitive **không có nút đóng**; mỗi sheet tự vẽ (QuickView, Edit có ✕; **Create không có ✕**) | `sheet.tsx:56-71`, `CreateTask/CreateTaskSheet.tsx:42-49` | Đưa header + close chuẩn vào `SheetContent` |
| 1.8 | Overlay `bg-black/80` (rất tối) ở cả dialog/sheet/alert; mobile sidebar overlay `bg-black/50` | `dialog.tsx:24`, `DashboardShell.tsx:22` | 1 token `--overlay` (đề xuất black/50 + blur nhẹ) |
| 1.9 | z-index tuỳ ý: dropdown/select `z-[200]`, dialog/sheet `z-50`, tooltip tự chế `z-[50]`, sidebar `z-30`, overlay `z-20` | `dropdown-menu.tsx:50,68`, `select.tsx:78`, `TaskCardAssignees.tsx:52` | Thang z-index token: base/sticky/drawer/modal/popover/toast |
| 1.10 | Thiếu primitive: **Card, Tooltip, Tabs, Skeleton, Popover, EmptyState, Spinner, Kbd, StatusBadge, PriorityBadge, FileItem** — mỗi màn tự vẽ (card bo `rounded-lg` 19 lần vs `rounded-xl` 16 lần; tooltip bằng `title=` 42 lần + 1 tooltip CSS tự chế) | nhiều | Bổ sung bộ primitive trên trước khi vẽ preview |
| 1.11 | `@radix-ui/react-tabs`, `react-scroll-area`, `react-toast` đã cài nhưng không có wrapper; Tabs chi tiết task tự viết bằng `<button>` | `DetailTabPanel.tsx:55-74` | Tạo `ui/tabs.tsx`, dùng chung |
| 1.12 | `Switch` primitive có nhưng chỉ 2 nơi dùng; Tạo task tự vẽ 2 toggle (`ImportantToggle`, `ForceModeToggle`) với kích thước `w-10 h-5.5` khác Switch `w-11 h-6` | `CreateTask/ImportantToggle.tsx:39-40`, `ui/switch.tsx:14` | Dùng `Switch` + `SettingRow` chung |
| 1.13 | Hai hàm `getInitials` trùng, màu avatar mặc định khác nhau: Header `#2563eb`, UserAvatar `#6366f1`; còn 2 avatar tự chế nữa (RecentCommentsChart `Avatar`, DeadlinesPanel `MiniAvatar` lấy **1** chữ cái) | `Header.tsx:37-42,57`, `UserAvatar.tsx:6-11,43`, `RecentCommentsChart.tsx:19`, `DeadlinesPanel.tsx:61` | 1 `UserAvatar` với size `xs/sm/md/lg` + `AvatarGroup` |

---

## 2. Typography

### 2.1 Thống kê cỡ chữ & độ đậm (phạm vi audit)

| Lớp | Số lần | | Lớp | Số lần |
|---|---|---|---|---|
| `text-sm` | 161 | | `font-semibold` | 103 |
| `text-xs` | 128 | | `font-medium` | 91 |
| `text-[10px]` | 55 | | `font-bold` | 48 |
| `text-[11px]` | 45 | | `font-black` | 7 |
| `text-lg` | 15 | | `font-normal` | 4 |
| `text-xl` | 10 | | | |
| `text-[9px]` | 8 | | | |
| `text-base` | 4 | | | |
| `text-[12px]`, `text-[13px]` | 2 + 2 | | | |
| `text-2xl`, `text-3xl`, `[14px]`, `[15px]`, `[28px]`, `[0.8em]` | 1 mỗi loại | | | |

→ **9px/10px/11px** chiếm ~40% số lần đặt cỡ chữ: chữ quá nhỏ cho tiếng Việt có dấu (dấu chồng trên/dưới bị dính). `font-black` (900) dùng cho mã task.

### 2.2 Tiêu đề trang — không nhất quán

| Màn hình | Phần tử | Lớp | File:dòng |
|---|---|---|---|
| Dashboard | `h1` "Bảng điều khiển" | `text-xl font-bold` + phụ đề `text-sm` | `app/(dashboard)/page.tsx:114-115` |
| Danh sách task | `h1` "Công việc" | `text-2xl font-bold tracking-tight` + icon `h-6` | `TaskList/TaskListClient.tsx:154-156` |
| Chi tiết task | `h1` = tiêu đề task | `text-lg font-bold` | `TaskDetail/DetailHero.tsx:64` |
| QuickView | `h2` tiêu đề task | `text-[15px] font-bold` | `TaskQuickView/QuickViewHero.tsx:59` |
| Sheet Tạo / Sửa / QuickView | `SheetTitle` | `text-sm font-bold` (primitive mặc định `text-lg`) | `CreateTaskSheet.tsx:43`, `EditTaskSheet.tsx:51`, `QuickViewHeader.tsx:23` |
| Modal hành động | `DialogTitle` | `text-lg font-semibold` | các modal |
| ReportDialog | `DialogTitle` | `text-base font-bold` | `ReportDialog.tsx:28` |
| Login | `h1` | `text-3xl font-bold` + emoji 👋 | `(auth)/login/page.tsx:59` |
| Đổi/Đặt lại MK, Xác nhận email | `h1` | `text-xl font-bold` | `(auth)/*/page.tsx` |

### 2.3 Tiêu đề khối (section header) — 5 kiểu khác nhau
| Kiểu | Ví dụ | File |
|---|---|---|
| `text-xs font-semibold uppercase tracking-widest text-gray-400` | "Biểu đồ Trạng thái · Tháng 10" | `app/(dashboard)/page.tsx:80,96,100` |
| `text-sm font-semibold` (thường) | "Cần duyệt", "Sắp hết hạn", "Nhiệm vụ gần đây" | `ActionItemsPanel.tsx:70`, `DeadlinesPanel.tsx`, `page.tsx:89` |
| `text-base font-semibold` | "Xu hướng 30 ngày qua" | `PerformanceChart.tsx:29` |
| `text-xs font-bold uppercase tracking-wider text-slate-500` + icon màu + viền trái màu | "Thông tin", "File đính kèm", "Người thực hiện" | `DetailSidebarMeta.tsx:30`, `DetailTaskAttachments.tsx:28`, `DetailAssignees.tsx:14` |
| `text-xs font-semibold uppercase tracking-wider text-slate-600` trên nền xám | QuickView "Thông tin/Người thực hiện/Bình luận" | `QuickViewMeta.tsx:21`, `QuickViewAssignees.tsx:20` |
| `text-[11px] … uppercase` | Notification group label | `NotificationDropdown.tsx:32` |
| `text-[10px] uppercase` | Sidebar group "Hệ thống/Tài khoản/Bảo mật/Quản trị" | `SettingsMenu.tsx:83,110,147,174` |

### 2.4 Mã task (task code) — 4 kiểu
| Nơi | Kiểu | File |
|---|---|---|
| Thẻ task | `font-mono text-xs font-black bg-slate-100 rounded` | `TaskRowCard.tsx:56` |
| QuickView | `font-mono text-[10px] font-black` + tiền tố `#` | `QuickViewHero.tsx:28` |
| Chi tiết | `font-mono text-xs font-black` + `#` | `DetailHero.tsx:59` |
| Dashboard | `font-mono text-[10px] text-gray-400` (không nền) / `font-bold text-indigo-600 bg-indigo-50` | `ActionItemsPanel.tsx:111`, `RecentCommentsChart.tsx:56` |
| Notification | `font-mono text-[10px] bg-indigo-50 text-indigo-600` | `NotificationItem.tsx:103` |

**Đề xuất typography scale** (8 bậc, tối thiểu 12px cho text đọc, 11px chỉ cho caption/badge):
`display 28/32 bold` (số liệu KPI) · `h1 24/32 semibold` (tiêu đề trang) · `h2 18/28 semibold` (tiêu đề modal/sheet/khối lớn) · `h3 14/20 semibold` (tiêu đề card) · `body 14/22` · `body-sm 13/20` · `caption 12/16` · `micro 11/14 medium` (badge, eyebrow uppercase). Mã task: `mono 12 medium`. Bỏ `font-black`, bỏ `text-[9px]/[10px]`.

---

## 3. Màu sắc

### 3.1 Màu nhấn chính lẫn lộn indigo / blue
| Nơi | Màu |
|---|---|
| Token `--primary` | `221 83% 53%` ≈ blue-600 (`globals.css:36`) → `Button default`, Login "Đăng nhập", phân trang |
| Sidebar active | `bg-blue-600` / `bg-blue-600/80` (cha) / `bg-blue-600/60` (Phân quyền) | `SidebarMenuItem.tsx:24`, `AnalyticsMenu.tsx:51`, `HRMenu.tsx:90` |
| Nút "Tạo công việc" (sheet), "Lưu thay đổi", "Chỉnh sửa" (detail), PasteImage | `bg-indigo-600` viết cứng | `CreateTaskFooter.tsx:105`, `EditTaskFooter.tsx:176`, `DetailHero.tsx:51` |
| Nút "Tạo công việc" ở trang danh sách | `Button` default = **blue** | `TaskListClient.tsx:194` |
| Auth (đổi MK, đặt lại MK, verify) | indigo-600 | `change-password/page.tsx:188` |
| Login nền | `amber-50/60` + chữ `stone-*` | `login/page.tsx:46` |
→ Cùng hành động "Tạo công việc" có 2 màu (blue ở trang, indigo trong sheet).

### 3.2 Ma trận mâu thuẫn trạng thái task (P0)

| Status | `TaskStatusBadge` (`TaskCard/TaskStatusBadge.tsx:4-12`) | `lib/constants.ts:23-31` | StatusDonut (`charts/StatusDonutChart.tsx:9-17`) | ActionItemsPanel (`:22-27`) | RecentActivities (`:30-58`) | Assignee utils (`taskRowCard.utils.ts`) |
|---|---|---|---|---|---|---|
| DRAFT | "Nháp" slate | **"Draft"** | "Nháp" #cbd5e1 | – | "Nháp" gray | – |
| PENDING_APPROVAL | "Chờ **D**uyệt" purple | "Chờ duyệt" | "Chờ duyệt" #8b5cf6 violet | violet | violet | #a855f7 |
| WAITING_ACKNOWLEDGE | "Chờ **T**iếp **N**hận" **blue** | "Chờ tiếp nhận" | **gray** #9ca3af | **amber** | **amber** | **#000000 (đen)** |
| IN_PROGRESS | "Đang **L**àm" **amber** | "Đang thực hiện" | "Đang làm" **orange** #f97316 | **blue** | amber | #f59e0b |
| PENDING_REVIEW | "Chờ Review" violet | "Chờ Review" | **"Chờ nghiệm thu"** **blue** #3b82f6 | "Chờ Review" violet | violet-400 | #a855f7 / "Chờ review" |
| COMPLETED | "Hoàn **T**hành" emerald | "Hoàn thành" | emerald | – | emerald | emerald |
| CANCELLED | "Đã **H**ủy" slate + gạch ngang | "Đã hủy" | "Đã **huỷ**" **red** | – | "Đã huỷ" **red** | red |

Ngoài ra còn `taskQuickView.constants.ts:1-23` (màu chữ assignee, `PENDING: text-slate-900` → mất trong dark), `DetailAssigneeItem.tsx:18-23` (`STATUS_BADGE` thiếu WAITING_ACKNOWLEDGE), `DeadlinesPanel.tsx:30`, `analytics/DrillDownModal.tsx:13,22` (PENDING_APPROVAL = **amber**).

**Đề xuất**: 1 file `task-status.ts` duy nhất: `{label, tone}` với tone ∈ {neutral, info, warning, accent, success, danger}; badge/donut/dot đều đọc tone → token. Nhãn chuẩn (sentence case): Nháp · Chờ duyệt · Chờ tiếp nhận · Đang thực hiện · Chờ nghiệm thu (hoặc "Chờ duyệt kết quả") · Hoàn thành · Đã hủy.

### 3.3 Ưu tiên (priority) — 1 dữ liệu, 6 cách vẽ
| Nơi | Kiểu | File |
|---|---|---|
| `PriorityBadge` (có icon theo level) | **không được dùng ở đâu** (dead code) | `TaskCard/PriorityBadge.tsx` |
| Thẻ task | dải trái 3px + gradient nền `color+08` | `TaskRowCard.tsx:43,48` |
| Chi tiết hero | `px-3 py-1 rounded-full text-xs font-medium`, nền `color+20` | `DetailHero.tsx:71` |
| QuickView | `text-[10px] px-1.5 rounded` (không full), nền `color+18` | `QuickViewHero.tsx:35` |
| Dashboard | `text-[10px] rounded-full py-px`, nền `color+20` | `ActionItemsPanel.tsx:114` |
| Form chọn | chấm tròn 2.5 | `PrioritySelect.tsx:31` |
→ Nối chuỗi hex `color + '15'` giả định màu luôn là `#RRGGBB`; nếu admin nhập `rgb()`/tên màu/`#abc` sẽ hỏng nền. Đề xuất: `PriorityBadge` duy nhất, alpha bằng `color-mix(in srgb, var(--p) 12%, transparent)`.

### 3.4 Chế độ quy trình (workflow) — nhãn & màu lệch
| Nơi | NEED_APPROVAL | Màu |
|---|---|---|
| `lib/constants.ts:47` | "Cần duyệt" | – |
| Thẻ, QuickView, Detail, Donut | "Phê duyệt" | indigo (thẻ) / **violet #8b5cf6** (donut `WorkflowDonut.tsx:11`) |
| IMMEDIATE | "Trực tiếp" | amber-100/600 (thẻ) vs amber-100/**800** (Detail `DetailHero.tsx:28`) |

### 3.5 Màu viết cứng khác
- Chart: hex cứng `#6366f1, #10b981, #f3f4f6, #9ca3af, #e5e7eb, #6b7280` — không theo dark mode (`PerformanceChart.tsx:57-73`, `WorkflowDonut.tsx`, `PriorityBreakdown.tsx:62`).
- Notification dropdown: `dark:bg-[#18181b]` (zinc-900) trong khi app dark dùng gray-900/slate-900 (`NotificationBell.tsx:49`, `NotificationDropdown.tsx:31`).
- Assignee viền avatar màu theo trạng thái bằng `outline: 2.5px solid` inline; trạng thái chờ tiếp nhận = **#000000** → vô hình trên dark (`taskRowCard.utils.ts:12`).
- Thẻ task: class `bg-white dark:bg-slate-800/60` bị **inline `background:` ghi đè** (shorthand reset màu nền về transparent) → thẻ trong suốt nhìn xuyên nền trang (`TaskRowCard.tsx:39 vs 43`).
- Nhãn form thiếu biến thể dark: `text-slate-700` không `dark:` ở PrioritySelect/TypeSelect (`PrioritySelect.tsx:19`, `TypeSelect.tsx:19`), QuickView giá trị deadline `'text-slate-700'` (`QuickViewMeta.tsx:47`).

---

## 4. Button

### 4.1 Primitive `button.tsx`
- Variants: `default, destructive, outline, secondary, ghost, link`. Size: `default h-10`, `sm h-9`, `lg h-11`, `icon h-10 w-10` (`components/ui/button.tsx:22-27`).
- **Thiếu** variant `success`, `warning`, `soft/subtle`, size `xs (h-7/h-8)`, `icon-sm`. Vì vậy:
  - `ActionButton` tự thêm `success/warning/blue` bằng class đè (`actions/components/buttons/ActionButton.tsx:7-17`).
  - Modal tự tô `bg-indigo-600 / bg-green-600 / bg-amber-600 / bg-red-600 … border-0` (8 file modal).
- `[&_svg]:size-4` trong base class **ghi đè** mọi `h-3.5 w-3.5`, `h-3 w-3` đặt trên icon con → các class đó vô tác dụng (VD `TaskListPagination.tsx:53`, `CommentItem.tsx:109,118`, `QuickViewHeader.tsx:31`).

### 4.2 Chiều cao nút thực tế (đo theo class)
| Chiều cao | Nơi |
|---|---|
| h-11 | (không dùng) |
| **h-10** | Button mặc định: "Tạo công việc" (trang), nút modal, Login; Input/Select mặc định |
| **h-9** | ActionButton (size sm) trong panel hành động; Select sort; input ngày lọc |
| h-8 | QuickView "Xem đầy đủ", nút ✕; kebab thẻ task |
| h-7 | Phân trang, comment Lưu/Hủy, select số dòng/trang |
| h-6 | "Xem xét" gia hạn, nút ✕ rút gia hạn, icon sửa/xoá comment |
| ~h-8 (py-1.5) | Nút tự viết "Chỉnh sửa" indigo, "Quay lại" (`DetailHero.tsx:46-55`) |
| ~h-10 (py-2.5) | Nút submit Auth tự viết (`change-password/page.tsx:188`) |
→ **Trên cùng 1 thanh lọc**: ô tìm kiếm h-10, 4 select h-10, select thời gian h-10, **2 ô ngày h-9**, select sắp xếp h-9, nút tạo h-10 (`TaskListFilters.tsx`, `DateFilter.tsx:35,43`, `TaskListClient.tsx:184`).

### 4.3 Nút tự viết thay vì `<Button>` (48 `<button>` thô)
Tiêu biểu: Header toggle/user (`Header.tsx:72,91`), ThemeToggle, Notification bell & "Đọc tất cả", sidebar group, CollapseToggle, "Quay lại"/"Chỉnh sửa" (`DetailHero.tsx:46,51`), tab Bình luận/Gia hạn (`DetailTabPanel.tsx:56`), "Xem toàn bộ" (`DetailContent.tsx:35`), nút "+ file" (`DetailTaskAttachments.tsx:32`), "Đính kèm" (`CreateTaskFooter.tsx:73`), chip xoá file, toggle ★/Force, range 7/30 ngày (`PerformanceChart.tsx:38`), "Xem tất cả" dashboard (`ActionItemsPanel.tsx:84`, `DeadlinesPanel.tsx`), dòng item dashboard, hiện/ẩn mật khẩu, submit Auth.
- "Xem tất cả" ở Dashboard: 2 nơi là `<button router.push>` cỡ `text-[11px] text-gray-400`, 1 nơi là `<a href>` `text-xs text-indigo-600` (full reload) — `page.tsx:90`.

### 4.4 Nút chỉ có icon thiếu nhãn
| Nút | File:dòng | Có title? | aria-label? |
|---|---|---|---|
| Kebab "…" thẻ task | `TaskCardMenu.tsx:70-73` | không | không |
| ✕ đóng QuickView | `QuickViewHeader.tsx:35` | không | không |
| ✕ đóng sheet Sửa | `EditTaskSheet.tsx:56-58` | không | không |
| ‹ › phân trang | `TaskListPagination.tsx:51-58, 66-69` | không | không |
| ✕ xoá file (Complete/Supplement/Create) | `CompleteTaskModal.tsx:172`, `SupplementReportModal.tsx:116`, `AttachmentChips.tsx:21` | không | không |
| ✕ rút yêu cầu gia hạn (không xác nhận!) | `ExtensionList.tsx:72-80` | không | không |
| 👁 hiện mật khẩu | `change-password/page.tsx:122,139`, `reset-password` | không | không |
| Collapse sidebar | `CollapseToggle.tsx:14` | có | không |
| Mobile menu | `Header.tsx:75` | – | "Toggle sidebar" (tiếng Anh) |

### 4.5 Vị trí & thứ tự nút trong modal/sheet
| Nơi | Thứ tự | Bố cục | File |
|---|---|---|---|
| 8 modal workflow (Confirm, Reason, Complete, Transfer, Reassign, RejectReview, RequestExtension, Supplement) | **Chính → Hủy** | `DialogFooter className="flex-col gap-2"` đè `flex-col-reverse` → mobile: chính trên; ≥640px: **2 nút w-full cạnh nhau, chính bên TRÁI**, khoảng cách 16px (gap-2 + space-x-2) | `ConfirmActionModal.tsx:61-66` … |
| ApproveExtension | Duyệt (xanh) → Từ chối (đỏ) → **Đóng** — 3 nút | như trên | `ApproveExtensionModal.tsx:74-90` |
| Sheet Tạo / Sửa | **Hủy → Chính**, phải | `flex justify-end gap-3` | `CreateTaskFooter.tsx:100-108`, `EditTaskFooter.tsx:172-181` |
| PasteImage | Hủy → Chính (indigo) | DialogFooter chuẩn | `PasteImageModal.tsx:72-73` |
| AlertDialog (primitive) | Hủy → Chính | chuẩn shadcn | `alert-dialog.tsx` |
**Đề xuất**: chuẩn duy nhất *Hủy (outline) trái – Hành động chính phải*, căn phải desktop, xếp dọc full-width trên mobile với nút chính ở dưới (gần ngón cái).

### 4.6 Nhãn nút
| Vấn đề | Ví dụ | File |
|---|---|---|
| Đóng modal: "Hủy" vs "Đóng" | ApproveExtension dùng "Đóng", còn lại "Hủy" | `ApproveExtensionModal.tsx:89` |
| Trùng nghĩa nguy hiểm | Modal "Hủy công việc": nút chính "Hủy công việc" + nút đóng "Hủy" | `TaskActionPanel.tsx:134-138`, `TaskListModals.tsx:156-160` |
| Lưu | "Lưu thay đổi" (sửa task), "Lưu" (sửa comment), "Đang lưu..." | `EditTaskFooter.tsx:180`, `CommentItem.tsx:110` |
| Loading | "Đang xử lý..." / "Đang gửi..." / "Đang tạo..." / "Đang lưu..." / "Đang đăng nhập..." — ok nhưng ActionButton **thay cả nhãn** bằng "Đang xử lý..." → nút nhảy độ rộng | `ActionButton.tsx:46` |
| Duyệt | "Duyệt" (confirm), "Duyệt công việc" (nút), "Duyệt KQ hoàn thành" (viết tắt KQ), toast "Đã duyệt kết quả hoàn thành!" (có !) | `TaskActionPanel.tsx:91,104`, `useApproveReview.ts:17` |
| Từ chối kế hoạch | Nút "Từ chối công việc", toast "Đã từ chối **kế hoạch**" | `useRejectPlan.ts:23` |
| Quick-action không xác nhận | Menu thẻ: Tiếp nhận / Duyệt công việc / Duyệt KQ chạy **ngay**; ở chi tiết lại mở modal xác nhận | `hooks/useTaskCardActions.ts:15-28` vs `TaskActionPanel.tsx:74-92` |
| Xoá comment, rút gia hạn | không hỏi xác nhận | `CommentItem.tsx:159`, `ExtensionList.tsx:76` |
| Bắt buộc lý do không thống nhất | "Từ chối công việc" (reject-plan) **không bắt buộc** ở trang chi tiết, **bắt buộc** ở danh sách | `TaskActionPanel.tsx:95-98` vs `TaskListModals.tsx:198-202` |

### 4.7 Màu nút hành động (cùng ý nghĩa, khác màu)
| Hành động | Nút ở panel (`TaskActionButtons.tsx`) | Nút xác nhận trong modal |
|---|---|---|
| Tiếp nhận / Duyệt / Khôi phục | emerald-600 (`success`) | **indigo-600** (variant `success` của ConfirmActionModal = indigo, `ConfirmActionModal.tsx:16`) |
| Hoàn thành | emerald-600 | **green-600** (`CompleteTaskModal.tsx:194`) |
| Chuyển giao | blue-600 | **indigo-600** |
| Giao lại | emerald | indigo |
| Xin gia hạn, Bổ sung báo cáo | amber-500 | amber-600 |
| Từ chối / Hủy / Làm lại | destructive (token red-500) | red-600 |

---

## 5. Bo góc

| Lớp | Số lần | Dùng cho |
|---|---|---|
| `rounded-full` | 91 | badge, avatar, chấm, toggle, pill ưu tiên (một số) |
| `rounded` (4px) | 66 | mã task, chip loại, chip workflow/Force/HD, pill ưu tiên QuickView, file row |
| `rounded-lg` | 56 | card chi tiết (sidebar), nút tự viết, sidebar item, modal (primitive sm:rounded-lg) |
| `rounded-md` | 41 | Button/Input/Select primitive, pagination |
| `rounded-xl` | 29 | thẻ task, card dashboard, card QuickView, notification dropdown, pagination bar |
| `rounded-sm` | 9 | dropdown item, checkbox, close dialog |
| `rounded-2xl` | 4 | empty state danh sách, card Auth |

**Lẫn lộn trên cùng loại thành phần**
- Card: `rounded-xl` (thẻ task, dashboard, QuickView) vs `rounded-lg` (sidebar chi tiết `DetailSidebarMeta.tsx:29`, CommentList, ExtensionList) vs `rounded-2xl` (empty state `TaskListGrid.tsx:56`, Auth).
- Badge/pill: StatusBadge `rounded-full` nhưng workflow/Force/HD/type `rounded` ngay cạnh nhau trên cùng dòng (`TaskRowCard.tsx:56-80`); priority `rounded-full` (detail) vs `rounded` (QuickView); "Mới hoàn thành" `rounded`.
- Nút: primitive `rounded-md` vs nút tự viết `rounded-lg` (Chỉnh sửa, Quay lại, Header icon) — đứng cạnh nhau ở hero chi tiết.
- Modal: primitive `sm:rounded-lg`, nhưng popover thông báo `rounded-xl`.
**Đề xuất**: `radius-sm 6px` (chip/badge vuông, input nhỏ) · `radius-md 8px` (button, input, select) · `radius-lg 12px` (card, popover, dropdown) · `radius-xl 16px` (modal, sheet cạnh) · `full` (avatar, status pill, count). Quy tắc: **status = full, meta-chip = sm**.

---

## 6. Khoảng cách, kích thước, độ dài

### 6.1 Modal / Sheet
| Thành phần | Rộng | File |
|---|---|---|
| ConfirmActionModal | `max-w-sm` (384) | `ConfirmActionModal.tsx:49` |
| ReasonModal | `sm:max-w-[440px]` | `ReasonModal.tsx:59` |
| Transfer, Reassign, RequestExtension, ApproveExtension | `sm:max-w-[480px]` | |
| Complete, Supplement, RejectReview | `sm:max-w-[520px]` + `max-h-[90vh]` | |
| PasteImage | `max-w-lg` (512) | `PasteImageModal.tsx:49` |
| ReportDialog | `sm:max-w-[760px] max-h-[86vh]` | `ReportDialog.tsx:21` |
| Sheet Tạo / Sửa / QuickView | `w-full sm:max-w-[800px]` | |
| Notification dropdown | `w-[400px]` cố định | `NotificationBell.tsx:48` |
| Mobile sidebar | `w-64` | `Sidebar.tsx:93` |
**Đề xuất 4 size**: `sm 400` (xác nhận) · `md 480` (form ngắn) · `lg 640` (form có file/nhiều người) · `xl 800` (xem báo cáo); sheet: `md 560`, `lg 800`. Header modal: chuẩn hoá hero màu (hiện 5 màu nền: indigo/amber/red/green) → icon tròn 40px + title trái, không nền màu cả dải.

### 6.2 Padding
- Vùng nội dung trang: `p-6` cố định cả mobile (`DashboardShell.tsx:50`) → mobile mất 48px ngang; trang chi tiết phải dùng `-m-6` để phá (`TaskDetailClient.tsx:32`, `TaskDetailLoader.tsx:14,25`).
- Card dashboard: `p-6` (Performance `PerformanceChart.tsx:26`), `p-5` (Donut trạng thái `page.tsx:79`), `p-4` (Priority, Workflow `page.tsx:95,99`), header `px-5 py-3.5` (panel), `px-5 py-4` (Nhiệm vụ gần đây) — trên cùng 1 lưới.
- Thẻ task `pl-4 pr-3 pt-3 pb-3` (lệch trái do dải 3px).
- Modal: hero `pt-5 pb-3 px-6`, body `px-6 py-4`, footer `px-6 pb-6 pt-0|pt-2`.
- Sheet header `h-14 px-6` (Tạo/Sửa) vs `px-5` (QuickView); footer `px-5`.
- Thống kê: `px-3` 48 · `px-6` 35 · `px-2` 35 · `px-1.5` 34 · `px-4` 31 · `px-5` 22; gap: `gap-2` 72 · `gap-3` 48 · `gap-1.5` 37 · `gap-1` 37 · `gap-5` 12 · `gap-2.5` 8 · `gap-4` 4.
- Grid dashboard: hàng KPI `gap-3`, các hàng sau `gap-5`; tasks grid `gap-4`; trang `space-y-5` (tasks) vs `space-y-4` (dashboard wrapper) + `space-y-5` (nội dung).
**Đề xuất**: thang 4/8/12/16/24/32; card padding chuẩn `16` (compact) / `20` (mặc định); grid gap `16`; page padding `16 mobile / 24 desktop`.

### 6.3 Header cao
Header app `h-16` (64) (`Header.tsx:70`), logo sidebar `h-16`; header sheet/QuickView `h-14` (56); DetailPageHeader (không dùng) `h-14`.

### 6.4 Độ dài text / cắt chữ
- `truncate` 25 lần, `line-clamp-1` 2, `-2` 1 (+1 inline style WebkitLineClamp ở thẻ task `TaskRowCard.tsx:117`), `-3` 3.
- Tiêu đề task: thẻ 2 dòng, QuickView **không cắt**, Chi tiết **không cắt**, Sheet sửa "Chỉnh sửa: {title}" **font-mono, không truncate** trong header cao cố định `h-14` → tiêu đề dài đẩy vỡ header (`EditTaskSheet.tsx:54`).
- Chip loại công việc `max-w-[120px] truncate`; tên người RecentActivities `max-w-[72px]` / `[80px]` (`RecentActivities.tsx:122,142`); chip file `max-w-[200px]`.
- Nội dung task: thu gọn `max-h-72` + "Xem toàn bộ" (`DetailContent.tsx`), QuickView `line-clamp-3` không có nút mở.
- Lý do gia hạn, phản hồi, ghi chú: không giới hạn, không `break-words` (`ExtensionList.tsx:84-86`) → URL dài tràn.
- Tooltip assignee `whitespace-nowrap` (`TaskCardAssignees.tsx:52`) → tên dài tràn khỏi thẻ.

---

## 7. Khung app (Shell)

| # | Phát hiện | File:dòng | Đề xuất |
|---|---|---|---|
| 7.1 | Sidebar mobile **không tự đóng khi chuyển trang** (không theo dõi `pathname`) | `DashboardShell.tsx:13-40` | đóng drawer khi route đổi; ESC đóng |
| 7.2 | Nút thu gọn sidebar `absolute -right-3 top-20` vẫn hiện trong drawer mobile; trạng thái thu gọn không lưu (reload = mở) | `CollapseToggle.tsx:17`, `DashboardShell.tsx:14` | ẩn `<lg`; lưu localStorage |
| 7.3 | Sidebar luôn tối `bg-gray-900` cả light mode; active 3 sắc độ `blue-600`, `/80`, `/60` | `Sidebar.tsx:92`, `HRMenu.tsx:56,90`, `AnalyticsMenu.tsx:51` | 1 trạng thái active + 1 trạng thái "cha đang mở" |
| 7.4 | Nhãn menu Anh–Việt lẫn: "Dashboard, Tasks, Logs, Helpdesk, Analytics, HR, Settings, Profile, SMTP Email" cạnh "Mức ưu tiên, Loại công việc, Nhân viên, Phân quyền" | `sidebar/config.ts:28-104`, `SettingsMenu.tsx:74`, `AnalyticsMenu.tsx:56`, `HRMenu.tsx:61` | Việt hoá toàn bộ: Tổng quan · Công việc · Nhật ký · Helpdesk · Phân tích · Nhân sự · Cài đặt · Hồ sơ |
| 7.5 | Item con sidebar 3 cỡ: `text-sm py-2.5` (cấp 1), `text-sm py-2` (cấp 2), `text-xs py-1.5 rounded` (cấp 3 phân quyền); group label `text-[10px]` | `HRMenu.tsx:106`, `SettingsMenu.tsx:83` | |
| 7.6 | Mục V2 "★ Quan trọng / Hoàn thành – chưa xem": badge đếm `text-[10px] min-w-[18px]` amber/emerald; khi thu gọn badge `absolute -top-0.5 right-1` đè icon | `TaskTrackingMenu.tsx:40-47` | |
| 7.7 | Thương hiệu trùng/lệch: logo sidebar "Phú Mỹ Hưng" + Header "TechOps" (ẩn <sm); Login "TechOps"; footer login "© 2026 Techops - Lê Minh · Version 1.0" (viết thường "Techops") | `SidebarLogo.tsx:22`, `Header.tsx:79`, `login/page.tsx:73-74` | |
| 7.8 | Header **không có breadcrumb, không có tiêu đề trang/tìm kiếm** — vùng trái trống (chỉ chữ TechOps) | `Header.tsx:71-80` | breadcrumb + tiêu đề ở header; nút hành động trang ở header phải |
| 7.9 | Menu user: "Profile" (Anh) cạnh "Đăng xuất"; role pill tự định nghĩa màu `ROLE_COLORS` (ADMIN đỏ, BOSS amber) khác `ROLE_BADGE_VARIANTS` trong constants | `Header.tsx:31-35,118`, `lib/constants.ts:15-19` | |
| 7.10 | 2 nút icon header `p-2 rounded-lg` (≈36px) — ổn nhưng không dùng Button icon | `Header.tsx:72`, `ThemeToggle.tsx:24`, `NotificationBell.tsx:29` | |
| 7.11 | Notification: dropdown `w-[400px]` cố định → tràn màn 360–390px; mở là **tự đánh dấu đã đọc tất cả** nên nút "Đọc tất cả" gần như không bao giờ hiện; không có "Xem tất cả thông báo", không phân trang; badge `99+` | `NotificationBell.tsx:18-23,48`, `NotificationDropdown.tsx:50` | `w-[min(400px,calc(100vw-16px))]`; tách "đã xem" vs "đã đọc" |
| 7.12 | Notification item: tiêu đề `text-[13px]`, nội dung `text-[12px]`, thời gian `text-[11px]`, mã `text-[10px]` — 4 cỡ px tuỳ ý trong 1 item | `NotificationItem.tsx:85,97,107,103` | |
| 7.13 | Thông báo loại không có TYPE_META (vd `EXTENSION_WITHDRAWN`, `TASK_CANCELLED`…) rơi về icon chuông xám | `NotificationItem.tsx:45-50` | |

---

## 8. Auth (login / reset / change / verify)

| # | Phát hiện | File:dòng |
|---|---|---|
| 8.1 | 2 hệ hình ảnh: Login (ảnh 60% + nền kem amber-50/stone, shadcn Input/Button h-10, primary **blue**) vs 3 trang còn lại (card trắng giữa nền slate-50, input tự viết `py-2` ≈ h-9, nút **indigo**) | `login/page.tsx`, `change-password/page.tsx:98-191` |
| 8.2 | Card: `max-w-md` (đổi/đặt lại MK) vs `max-w-sm` (verify) | `verify-email/page.tsx:67` |
| 8.3 | 3 trang ngoài login **không có dark mode** (`bg-white`, `text-gray-900` cứng) trong khi login có `dark:` | |
| 8.4 | Login: không có "Quên mật khẩu?", không có nút hiện mật khẩu (trang đổi MK lại có); tiêu đề có emoji 👋 `text-3xl`; footer cứng "Version 1.0" | `login/page.tsx:59,73-74` |
| 8.5 | Ô "Xác nhận mật khẩu mới" không có nút 👁 trong khi 2 ô kia có; nút 👁 `top-2.5` tuyệt đối, không aria-label | `change-password/page.tsx:122,139,169` |
| 8.6 | Logic chính sách mật khẩu (`getPolicyChecks`, `DEFAULT_POLICY`) copy y hệt 2 file | `change-password/page.tsx:20-37`, `reset-password/page.tsx:20-37` |
| 8.7 | Lỗi gộp policy thành 1 chuỗi nối dấu phẩy ("Ít nhất 8 ký tự, Có ít nhất 1 chữ hoa (A-Z), …") — khó đọc | `change-password/page.tsx:67-68` |
| 8.8 | Verify email: "Quay về trang chủ →" là link gạch chân (không phải nút); trạng thái lỗi/thành công dùng icon `w-14` (các trang khác `w-12`) | `verify-email/page.tsx:26-35` |
| 8.9 | Spinner: reset dùng vòng tròn border tự vẽ; trang task dùng `Loader2`; danh sách task dùng border spinner — 3 kiểu spinner | `reset-password/page.tsx:117`, `TaskDetailLoader.tsx:16`, `TaskListGrid.tsx:38` |

---

## 9. Danh sách công việc (`/tasks`)

| # | Phát hiện | File:dòng | Đề xuất |
|---|---|---|---|
| 9.1 | Header trang `flex justify-between` **không wrap**: tiêu đề + nút "Đánh dấu đã xem tất cả" + Select sắp xếp `w-48` + nút Tạo → tràn trên mobile/tablet | `TaskListClient.tsx:152-198` | wrap / dồn sort vào thanh lọc |
| 9.2 | Ô tìm kiếm cập nhật URL **mỗi phím gõ** (`router.replace`), không debounce → giật, mất focus/ký tự khi mạng chậm | `TaskListClient.tsx:94,145-147` | debounce 300ms |
| 9.3 | Thanh lọc: 7 control độ rộng cứng `w-[170px] w-[150px] w-[160px] w-[150px] w-[140px]` + 2 input ngày không nhãn (chỉ `title`), cao h-10 vs h-9; không có nút "Xoá bộ lọc", không chip hiển thị lọc đang bật | `TaskListFilters.tsx:47-105`, `DateFilter.tsx:20-46` | FilterBar chuẩn: search + "Bộ lọc" (popover) + chip |
| 9.4 | Mặc định ẩn Hoàn thành/Đã hủy nhưng nhãn select là "Chưa hoàn thành" — dễ hiểu; tuy nhiên tổng số "Tổng cộng N công việc" dùng `Badge secondary font-mono` giữa câu | `TaskListClient.tsx:160-163` | |
| 9.5 | Loading: spinner giữa trang (không skeleton thẻ) → layout nhảy | `TaskListGrid.tsx:35-43` | skeleton 8 thẻ |
| 9.6 | Error: hộp đỏ "Không thể tải danh sách công việc", **không có nút thử lại** | `TaskListGrid.tsx:46-51` | |
| 9.7 | Empty: luôn hiện "Tạo công việc đầu tiên" kể cả khi đang lọc/tìm/đang ở mục ★ hoặc "chưa xem" → sai ngữ cảnh; chữ mô tả `text-slate-500` (không token), icon `opacity-30` | `TaskListGrid.tsx:54-72` | 3 biến thể empty: chưa có dữ liệu / không khớp lọc (+ Xoá lọc) / view đặc biệt |
| 9.8 | Lưới thẻ 1→2→3→4→**5 cột** (2xl) — thẻ hẹp ~250px làm dòng meta chen chúc | `TaskListGrid.tsx:76` | tối đa 4 cột hoặc có chế độ bảng |
| 9.9 | **Không có chế độ xem bảng/list** (chỉ card); không chọn nhiều | | |
| 9.10 | Phân trang: luôn hiển thị (kể cả 1 trang), nút h-7 (28px) nhỏ cho touch; `text-slate-500/400` cứng | `TaskListClient.tsx:246`, `TaskListPagination.tsx:31-70` | |

### 9.A Thẻ task (`TaskRowCard`)
| # | Phát hiện | File:dòng |
|---|---|---|
| A1 | **Màu deadline đảo** (≤3 ngày xanh lá, ≤7 ngày vàng, quá hạn đỏ + "!" ) | `taskRowCard.utils.ts:41-45`, `TaskCardMeta.tsx:33-40` |
| A2 | Nền thẻ bị inline gradient ghi đè → thẻ trong suốt | `TaskRowCard.tsx:39,42-44` |
| A3 | Dòng 1 chứa tới 5 chip (mã, workflow, Force, HD, ★, ⋯) — mỗi chip cỡ khác: mã `text-xs font-black`, còn lại `text-[10px]`; "Force", "HD" tiếng Anh | `TaskRowCard.tsx:54-82` |
| A4 | Dòng 2: StatusBadge (rounded-full, `text-xs`) + "Mới hoàn thành" (rounded, emerald đặc, `text-[10px]`) + chip loại (`text-[10px]`) — 3 phong cách badge | `TaskRowCard.tsx:103-113` |
| A5 | Avatar người thực hiện: hover `scale-125 rotate-12` (đùa); viền trạng thái `outline 2.5px` inline; bubble "+N" `w-8 h-8` trong khi avatar `h-7` → lệch cỡ | `TaskCardAssignees.tsx:24-40` |
| A6 | Tooltip tự chế bằng CSS hover (không mở được bằng bàn phím/touch), tiêu đề "**IT Support** (n)" | `TaskCardAssignees.tsx:52-73` |
| A7 | ★ chỉ hiện khi hover thẻ (`opacity-0 group-hover:opacity-100`) → không thấy trên touch | `TaskRowCard.tsx:86` |
| A8 | Click cả thẻ mở QuickView nhưng thẻ là `<div onClick>` (không focus được bằng Tab, không role) | `TaskRowCard.tsx:37-46` |
| A9 | Menu ⋯ dùng 5 màu chữ khác nhau cho item (emerald/red/blue/amber/mặc định); nhãn "Duyệt KQ hoàn thành", "Duyệt gia hạn (dd/mm/yyyy)" | `TaskCardMenu.tsx:80-175` |
| A10 | Icon loại công việc lấy động `LucideIcons[task.type.icon]` → import toàn bộ lucide (bundle nặng); tên icon sai = trống | `TaskRowCard.tsx:6,111` |

---

## 10. Chi tiết công việc (`/tasks/[id]`)

| # | Phát hiện | File:dòng |
|---|---|---|
| 10.1 | Layout 3 cột cứng: trái (hero + tiến trình + [Bình luận·Gia hạn 60% + Lịch sử 40%]) + phải `w-96` — **không responsive**; laptop 1280px: cột Lịch sử còn ~250px | `TaskDetailClient.tsx:32-57`, `DetailTabPanel.tsx:53,93` |
| 10.2 | "Quay lại" là link chữ, luôn về `/tasks` (mất bộ lọc/trang trước) | `DetailHero.tsx:46-49`, `TaskDetailClient.tsx:42` |
| 10.3 | Nút "Chỉnh sửa" indigo tự viết đặt góc phải trên cùng, **tách xa** khối nút hành động (khung indigo nhạt bên dưới) | `DetailHero.tsx:50-55, 82-93` |
| 10.4 | Khối hành động: nền `indigo-50/50` + tối đa 13 nút đủ màu (emerald/red/blue/amber) wrap nhiều dòng; không phân cấp chính/phụ | `TaskActionButtons.tsx:23-75` |
| 10.5 | Badge hero: Status (Badge outline) + Priority (pill `px-3 py-1`) + Workflow (pill `px-3 py-1`) — 2 chiều cao khác nhau trên cùng hàng | `DetailHero.tsx:68-79` |
| 10.6 | "Không có mô tả" italic xám — ok; nội dung HTML render bằng `dangerouslySetInnerHTML` + style lồng `[&_ul]…` (lặp ở QuickView) | `DetailContent.tsx:25-34`, `QuickViewHero.tsx:69-73` |
| 10.7 | Tiến trình (WorkflowTimeline) ẩn hoàn toàn khi Đã hủy — không có trạng thái "đã hủy tại bước X" | `DetailTimeline.tsx:9` |
| 10.8 | Tab tự viết; số đếm "Lịch sử" = `auditLogs.length` nhưng danh sách **lọc bỏ COMMENT_ADDED** → số trên badge lớn hơn số dòng | `DetailTabPanel.tsx:25,97-101` vs `DetailAuditLog.tsx:13-15` |
| 10.9 | Trong tab Bình luận lại có thêm tiêu đề "Bình luận (n)" + Separator → tiêu đề lặp | `CommentList.tsx:24-35` |
| 10.10 | Sidebar phải: 3 card với **viền trái 4px 3 màu** (indigo/amber/emerald), tiêu đề uppercase; card "Người thực hiện" bị ẩn hẳn khi 0 người (không empty) | `DetailSidebarMeta.tsx:29`, `DetailTaskAttachments.tsx:26`, `DetailAssignees.tsx:10-13` |
| 10.11 | Nút "+" Thêm file **không có hành động** | `DetailTaskAttachments.tsx:32-37` |
| 10.12 | Icon file 5 màu theo đuôi (pdf đỏ, ảnh xanh, excel xanh lá, docx xanh đậm, pptx cam); nút Xem/Tải ẩn tới khi hover; hàm `formatSize` copy 4 nơi với logic khác (có/không mức "B") | `DetailTaskAttachments.tsx:8-22,55`, `DetailAssigneeItem.tsx:13`, `AssigneeRejectCard.tsx:16`, `CompleteTaskModal.tsx` (KB), `AttachmentChips.tsx:20` (MB) |
| 10.13 | Badge trạng thái người thực hiện `STATUS_BADGE` thiếu `WAITING_ACKNOWLEDGE` → rơi về xám; dùng `rounded` (khác badge task `rounded-full`) | `DetailAssigneeItem.tsx:22-27,59` |
| 10.14 | Báo cáo: file đính kèm icon `w-2.5 h-2.5` (10px) + hover mới hiện; chữ `text-[10px]/[11px]` | `DetailAssigneeItem.tsx:92-106` |
| 10.15 | Meta "Hạn hoàn thành": tính quá hạn chỉ loại COMPLETED (task **Đã hủy vẫn báo "Quá hạn N ngày"**) | `DetailSidebarMeta.tsx:19-22,48` (cũng `QuickViewMeta.tsx:13`) |
| 10.16 | Gia hạn: "Yêu cầu gia hạn (n/5)" — số 5 cứng; badge "Đã duyệt" dùng variant `default` (= primary xanh dương) thay vì success; nút ✕ rút đơn không xác nhận, không nhãn; fallback "Unknown" | `ExtensionList.tsx:28-32,51,72-80,101` |
| 10.17 | Loading = spinner toàn trang; Lỗi/không quyền/không tồn tại gộp 1 thông báo xám, không nút quay lại | `TaskDetailLoader.tsx:12-31` |
| 10.18 | `DetailPageHeader` (header sticky đẹp hơn, có countdown) **không được dùng** | `TaskDetail/DetailPageHeader.tsx` |

---

## 11. Xem nhanh (TaskQuickViewSheet)

| # | Phát hiện | File:dòng |
|---|---|---|
| 11.1 | Rộng 800px, bố cục khác hẳn trang chi tiết (meta dạng lưới 2 cột `MetaCell` có icon màu; chi tiết dạng danh sách) → 2 ngôn ngữ hiển thị cho cùng dữ liệu | `QuickViewMeta.tsx`, `DetailSidebarMeta.tsx` |
| 11.2 | Ô hạn chót nhãn **"Hoàn thành"** (dễ hiểu nhầm là ngày đã hoàn thành); "Loại CV" viết tắt | `QuickViewMeta.tsx:32,46` |
| 11.3 | Danh sách người thực hiện **không hiện trạng thái** (chi tiết có) | `QuickViewAssignees.tsx:26-41` |
| 11.4 | Bình luận QuickView **có trả lời/@mention** + gửi bằng icon; trang chi tiết dùng `CommentList` **không có trả lời**, gửi bằng nút "Gửi" → 2 trải nghiệm bình luận | `QuickViewComments.tsx`, `Comments/CommentList.tsx` |
| 11.5 | Header: icon `ExternalLink` làm biểu tượng tiêu đề "Xem nhanh công việc"; nút "Xem đầy đủ" mở **tab mới** (`window.open`) — trong menu thẻ "Xem chi tiết" lại mở QuickView | `QuickViewHeader.tsx:18,24-32` vs `TaskCardMenu.tsx:77` |
| 11.6 | Footer hành động cố định đáy (tốt) nhưng ẩn hoàn toàn khi `permissions.isLoading` → nhảy layout | `QuickViewActions.tsx:12` |
| 11.7 | `QuickViewSkeleton.tsx` tên là skeleton nhưng chỉ là spinner | `QuickViewSkeleton.tsx:5-12` |
| 11.8 | Workflow chip ghi "Helpdesk" (thẻ ghi "HD") | `QuickViewHero.tsx:50-53` vs `TaskRowCard.tsx:76-79` |

---

## 12. Tạo / Sửa công việc (Sheet)

| # | Phát hiện | File:dòng |
|---|---|---|
| 12.1 | 2 cột cứng (trái flex-1, phải `w-[300px]`) trong sheet `w-full` → mobile vỡ | `CreateTaskRight.tsx:37`, `EditTaskRight` tương tự |
| 12.2 | Sheet Tạo không có nút ✕; sheet Sửa có ✕ (h-8 ghost, không nhãn) | `CreateTaskSheet.tsx:42-49`, `EditTaskSheet.tsx:56-58` |
| 12.3 | Nút chính: Tạo không icon "Tạo công việc"; Sửa có icon Save "Lưu thay đổi"; cả 2 indigo cứng | `CreateTaskFooter.tsx:101-107`, `EditTaskFooter.tsx:173-181` |
| 12.4 | Nhãn trường: "IT Support *" (tiếng Anh, đồng thời là tên phòng ban) — nơi khác gọi "Người thực hiện" | `CreateTaskRight.tsx:49` |
| 12.5 | Hạn chót gọi "Ngày hoàn thành" (form) vs "Hạn hoàn thành" (chi tiết) vs "Hoàn thành" (QuickView) vs "Deadline" (sort) | `CreateTaskRight.tsx:65` |
| 12.6 | Control tự chế, không dùng primitive: `TitleInput` (input bọc div), `InlineSelect` (Radix select riêng, max-h 200), `DateField` ẩn icon lịch native, `AssigneeSelect` (checkbox native `accent-indigo-600 w-3.5`), `WorkflowModeSelect` (2 thẻ), 2 toggle | `CreateTask/*.tsx` |
| 12.7 | Nhãn trường: `text-sm font-semibold text-slate-700` (form tạo) vs `Label` primitive `text-sm font-medium` (modal) vs `text-xs text-slate-500` (meta) | `TitleInput.tsx:20`, `ReasonModal.tsx:69` |
| 12.8 | Lỗi trường: `FieldError text-xs text-red-500 mt-1` vs inline `<p className="text-xs text-red-500">` (Priority/Type) vs `text-destructive` (modal) | `FieldError.tsx:3`, `PrioritySelect.tsx:37`, `CompleteTaskModal.tsx:160` |
| 12.9 | Gợi ý dán ảnh "Tip: Win+Shift+S rồi Ctrl+V" — chỉ đúng Windows; lặp ở 4 nơi; ẩn <md ở sheet nhưng hiện ở modal | `CreateTaskFooter.tsx:86`, `EditTaskFooter.tsx:158`, `CompleteTaskModal.tsx:186`, `SupplementReportModal.tsx:130` |
| 12.10 | Dung lượng file: chip hiện "(0.3MB)" kể cả file 20KB; modal hiện "20KB" | `AttachmentChips.tsx:20` |
| 12.11 | Header sheet Sửa: "Chỉnh sửa: {title}" font-mono, không truncate | `EditTaskSheet.tsx:54` |
| 12.12 | Trạng thái chờ tải sheet Sửa: header "Đang tải..." + body "Đang tải dữ liệu...", `bg-white` không dark, không có nút đóng | `TaskModals/EditTaskModal.tsx:16-30` |
| 12.13 | Không cảnh báo khi đóng sheet có dữ liệu chưa lưu | `useCreateTaskForm.ts` / `EditTaskSheet.tsx` |

---

## 13. Modal hành động — bảng so sánh

| Modal | Rộng | Nền hero | Icon | Nút chính (màu/nhãn) | Validation | Ghi chú |
|---|---|---|---|---|---|---|
| ConfirmActionModal (Tiếp nhận, Duyệt CV, Duyệt KQ, Khôi phục) | 384 | indigo (cả variant "success") | ✓ | indigo "Tiếp nhận"/"Duyệt"/"Khôi phục" | – | mô tả căn giữa |
| ReasonModal (Từ chối CV, Từ chối nhận, Hủy CV) | 440 | red (destructive) / amber | ⚠ | red | bắt buộc tuỳ chỗ | label cố định "Lý do" |
| CompleteTaskModal | 520 | green | ✓ | **green-600** "Gửi báo cáo" | ≥10 ký tự, nút disable + đếm | hướng dẫn "Settings → Mẫu hoàn thành" (tiếng Anh) `:145` |
| SupplementReportModal | 520 | amber | FilePlus2 | amber "Gửi bổ sung" | ≥10 ký tự | có phụ đề `text-xs` (modal khác không) `:90` |
| RejectReviewModal | 520 | red | RotateCcw | red "Yêu cầu làm lại" | lý do từng người | Checkbox primitive tô đỏ |
| TransferModal | 480 | indigo | ⇄ | indigo "Chuyển giao" | nút disable khi chưa chọn người, lỗi chỉ cho ghi chú | |
| ReassignModal | 480 | indigo | Users | indigo "Giao lại" | disable | **checkbox native** (khác RejectReview) `:47` |
| RequestExtensionModal | 480 | amber | Clock | amber "Gửi yêu cầu" | disable, không báo lỗi | tiêu đề "Xin gia hạn **Hoàn thành**", nhãn "**Hoàn thành hiện tại**" `:50,54`; gọi `handleClose()` **ngay sau** submit → không thấy loading/lỗi `:40` |
| ApproveExtensionModal | 480 | amber | CalendarCheck | green "Duyệt gia hạn" + red "Từ chối" + "Đóng" | – | đóng ngay khi bấm, không loading `:76,83`; badge "Đang chờ" outline |
| PasteImageModal | 512 | – (header chuẩn) | ImagePlus | indigo | – | duy nhất dùng DialogHeader chuẩn |
| ReportDialog | 760 | – | – | (không footer) | – | Description đặt **trên** Title |

---

## 14. Bình luận & đính kèm

| # | Phát hiện | File:dòng |
|---|---|---|
| 14.1 | 2 component bình luận khác nhau (xem 11.4) | |
| 14.2 | Nút Trả lời/Sửa/Xoá `h-6 w-6`, ẩn tới khi hover; Xoá **không xác nhận** | `CommentItem.tsx:130-166` |
| 14.3 | Mention `@[Tên]` render `text-[0.8em]` (nhỏ hơn chữ xung quanh) | `CommentItem.tsx:28` |
| 14.4 | Thời gian comment định dạng đầy đủ `dd/mm/yyyy hh:mm`; notification dùng "x phút trước"; dashboard dùng `timeAgo` riêng | `CommentItem.tsx:38-44`, `NotificationItem.tsx:106`, `RecentCommentsChart.tsx:72` |
| 14.5 | "(đã chỉnh sửa)" so sánh `updatedAt !== createdAt` trên chuỗi/Date | `CommentItem.tsx:86` |
| 14.6 | Khi task Hoàn thành/Đã hủy: ô nhập biến mất, **không có dòng giải thích** | `CommentList.tsx:69`, `DetailTabPanel.tsx:79` |
| 14.7 | Empty: "Chưa có bình luận nào. Hãy là người đầu tiên!" (chi tiết) vs "Chưa có bình luận nào" (QuickView, dashboard) | `CommentList.tsx:64` |
| 14.8 | Danh sách file: 5 cách vẽ (DetailTaskAttachments có icon màu 20px; báo cáo assignee 12px; ReportDialog có chữ "Xem/Tải về"; AssigneeRejectCard 12px + ExternalLink 10px; chip khi tạo) | xem 10.12 |

---

## 15. Dashboard (`/`)

| # | Phát hiện | File:dòng |
|---|---|---|
| 15.1 | KPI: 6 thẻ `grid-cols-2 sm:3 lg:6`; tiêu đề `text-[11px] uppercase tracking-widest truncate` — "Chờ tiếp nhận", "SLA đúng hạn" bị cắt ở lg 6 cột; giá trị `text-[28px]`; chấm màu góc phải trùng ý với icon | `StatCard.tsx:43-58` |
| 15.2 | Hai thẻ dùng cùng màu `purple` (Chờ duyệt & Chờ Review / Đang thực hiện & Chờ tiếp nhận) | `page.tsx:44-52` |
| 15.3 | Nhãn KPI theo vai trò: Boss "Chờ duyệt / Chờ **R**eview", nhân viên "Đang thực hiện / Chờ tiếp nhận"; panel lại ghi "**Cần duyệt**"/"Cần xử lý" | `page.tsx:46-50`, `ActionItemsPanel.tsx:62` |
| 15.4 | "Quá hạn" đổi màu đỏ/xanh lá theo giá trị; SLA teal/orange/red — tốt, nhưng ngưỡng 80/60 viết cứng | `page.tsx:34,53-54` |
| 15.5 | Skeleton hàng 2 có **2** khối trong khi thật là **3** khối → nhảy bố cục | `DashboardSkeleton.tsx:13-16` vs `page.tsx:64` |
| 15.6 | Lỗi: dòng chữ xám "Không thể tải dữ liệu. Vui lòng thử lại." — không nút thử lại | `page.tsx:24-28` |
| 15.7 | Card không dùng primitive; padding p-4/p-5/p-6 lẫn (6.2); tiêu đề 3 cỡ (2.3) | |
| 15.8 | Item danh sách hover `hover:border-l-2` → nội dung xê dịch 2px khi rê chuột | `ActionItemsPanel.tsx:104`, `DeadlinesPanel.tsx:109`, `RecentCommentsChart.tsx:51` |
| 15.9 | `DeadlineInfo` copy y hệt ở ActionItemsPanel và DeadlinesPanel; "Quá N ngày"/"Hôm nay"/"còn N ngày" (chữ thường) vs chi tiết "Quá hạn N ngày"/"Còn N ngày" | `ActionItemsPanel.tsx:29-56`, `DeadlinesPanel.tsx:37-58`, `DetailSidebarMeta.tsx:50` |
| 15.10 | Empty: "Không có **task** nào cần duyệt", "Không có task nào sắp hết hạn", "Chưa có **nhiệm vụ** nào", "Chưa có dữ liệu" (chart) | `ActionItemsPanel.tsx:93`, `DeadlinesPanel.tsx:101`, `RecentActivities.tsx:157` |
| 15.11 | Chart: không dark mode (grid/tooltip/legend hex); PerformanceChart không có empty (toàn số 0 vẫn vẽ) và không có error; segmented 7/30 tự viết; mô tả "Task tạo mới vs hoàn thành" | `PerformanceChart.tsx:33,48-77` |
| 15.12 | Bảng "Nhiệm vụ gần đây" là `<table>` thô; cột người/creator ẩn dần `hidden sm/lg`, `max-w-[72px]` | `RecentActivities.tsx:122-183` |
| 15.13 | Không có bộ chọn kỳ (tháng) chung; donut ghi "Tháng {n}" nhưng KPI không nói kỳ | `page.tsx:80,96,100` |

---

## 16. Văn bản tiếng Việt

### 16.1 Thuật ngữ
| Khái niệm | Các biến thể đang dùng | Đề xuất |
|---|---|---|
| Task | "Công việc" (~80), "task/Task" (~58, gồm cả UI: "Không có task nào…", "Task quan trọng", "Task tạo mới"), "Nhiệm vụ" (4), menu "Tasks" | **Công việc** |
| Deadline | "Hoàn thành", "Ngày hoàn thành", "Hạn hoàn thành", "Hoàn thành hiện tại", "Deadline", "Deadline mới" (audit log) | **Hạn hoàn thành** |
| Người thực hiện | "IT Support", "Người thực hiện", "người nhận" | **Người thực hiện** |
| Chờ review | "Chờ Review", "Chờ review", "Chờ nghiệm thu" | chọn 1 |
| Duyệt kết quả | "Duyệt KQ hoàn thành", "Duyệt kết quả hoàn thành!" | **Duyệt kết quả** |
| Từ chối kế hoạch | "Từ chối công việc" (nút) / "Đã từ chối kế hoạch" (toast) | thống nhất |
| Chế độ | "Phê duyệt" / "Cần duyệt" (constants) | thống nhất |
| Hủy | "hủy" 99 lần / "huỷ" 10 lần (StatusDonut, RecentActivities…) | **hủy** |

### 16.2 Viết hoa
- Title Case kiểu Anh trong badge: "Chờ Duyệt", "Chờ Tiếp Nhận", "Đang Làm", "Hoàn Thành", "Đã Hủy" (`TaskStatusBadge.tsx:5-11`) — nơi khác sentence case.
- "Xin gia hạn Hoàn thành" (`RequestExtensionModal.tsx:50`), "Biểu đồ Trạng thái", "Biểu đồ Độ ưu tiên", "Biểu đồ Flow" (`page.tsx:80,96,100`), "Xác nhận Email".
- "còn N ngày" thường vs "Còn N ngày".

### 16.3 Tiếng Anh còn sót (UI)
"Dashboard", "Tasks", "Logs", "Analytics", "HR", "Settings", "Profile", "SMTP Email", "IT Support", "Force", "HD", "Draft", "Review", "Flow", "Unknown", "Toggle sidebar", "Close" (sr-only), "Settings → Mẫu hoàn thành", "Tip:", "Light mode/Dark mode", "Version", lỗi server qua toast: "Insufficient permissions", "Authentication required", "Too many requests. Please try again later.", "File type .x not allowed. Only PDF files accepted." (`toast.error(err.message)` ×20 trong `actions/hooks/*`).

### 16.4 Thông báo khó hiểu / thiếu
- "Không tìm thấy công việc — Công việc có thể đã bị xóa hoặc bạn không có quyền xem" (gộp 3 nguyên nhân: lỗi mạng/không quyền/không tồn tại) `TaskDetailLoader.tsx:27-28`.
- Policy mật khẩu nối chuỗi dài (8.7).
- Toast có/không dấu "!" ("Đã duyệt kết quả hoàn thành!" duy nhất), có "—" ("Đã duyệt gia hạn — deadline đã cập nhật").

---

## 17. Ma trận trạng thái màn hình (Loading / Empty / Error)

| Màn hình / khối | Loading | Empty | Error | Ghi chú |
|---|---|---|---|---|
| Dashboard tổng | Skeleton (sai số khối) | – | Text xám, không retry | |
| KPI | qua skeleton | "—" cho SLA | – | |
| Cần duyệt / Cần xử lý | – | Text | – | |
| Sắp hết hạn | – | Text | – | |
| Bình luận gần đây | – | Icon + text | – | |
| Performance chart | Spinner | **Thiếu** | **Thiếu** | |
| Donut trạng thái/ưu tiên/flow | – | "Chưa có dữ liệu" | – | |
| Nhiệm vụ gần đây | – | Text | – | |
| Danh sách task | Spinner | Card + CTA (sai ngữ cảnh khi lọc) | Hộp đỏ, không retry | |
| Header đếm tổng | "Đang tải..." | – | – | |
| Chi tiết task | Spinner toàn trang | – | Gộp "Không tìm thấy" | |
| Mô tả | – | "Không có mô tả" | – | |
| File đính kèm | – | "Chưa có tài liệu đính kèm" | – | |
| Người thực hiện | – | **Ẩn card** | – | |
| Bình luận | Skeleton 3 dòng | Text | **Thiếu** | |
| Gia hạn | – | Text | – | |
| Lịch sử | – | Text | – | |
| QuickView | Spinner | – | Text | |
| Sheet Sửa | Text "Đang tải..." | "Không có dữ liệu" | – | |
| Notification | Spinner + text | Icon + 2 dòng (tốt nhất app) | **Thiếu** | |
| Sidebar quyền | menu hiện dần (nhảy) | – | nuốt lỗi | `Sidebar.tsx:57-66` |
| Modal Complete — mẫu | – | hộp hướng dẫn | – | |
| Modal Transfer/Reassign — danh sách người | **Thiếu** (select rỗng) | **Thiếu** | – | |
| Auth reset — check token | Spinner | – | Card "Link không khả dụng" | |

---

## 18. Responsive

| Màn hình | Vấn đề | Mức |
|---|---|---|
| Shell | Drawer không đóng khi điều hướng; nút collapse thò ra; padding `p-6` cố định | P1 |
| Header | Dropdown thông báo 400px tràn; vùng trái trống | P1 |
| Danh sách task | Header không wrap; 7 filter wrap thành 3–4 dòng; sort w-48 | P1 |
| Chi tiết task | **3 cột cứng, vỡ hoàn toàn <1024px** | P0 |
| QuickView | OK (w-full), meta 2 cột hơi chật ở 360px; assignee lưới 2 cột | P2 |
| Sheet Tạo/Sửa | **2 cột cứng, cột phải 300px** | P0 |
| Modal | `w-full` không có margin ngang trên mobile (primitive dialog không `mx-4`) → chạm mép; footer 2 nút ok | P1 |
| Dashboard | KPI 2 cột ok; panel 1 cột ok; bảng gần đây ẩn cột | P2 |
| Login | Ảnh ẩn <lg, ok | – |
| Thao tác hover-only | ★, Xem/Tải file, Sửa/Xoá comment, tooltip assignee | P1 |

---

## 19. Icon (lucide)

| Kích thước | Số lần (w/h) | Dùng |
|---|---|---|
| `w-4 h-4` | 92 | mặc định trong nút, menu |
| `w-3.5 h-3.5` | 55 | meta, header khối, nút nhỏ |
| `w-3 h-3` | 44 | chip, badge |
| `w-5 h-5` | 25–30 | sidebar, header, icon file |
| `w-6 h-6` | ~40 | icon hero modal, empty |
| `w-2.5 h-2.5` | 8–10 | ExternalLink/Download trong báo cáo, icon trong pill dashboard |
| `w-7`, `w-8` | | empty state, notification icon |
- Icon trong cùng vai trò khác cỡ: header khối chi tiết `3.5`, header khối dashboard `4`; icon sidebar cấp 1 `5`, cấp 2 `4`, chevron `4` / `3`.
- Ý nghĩa trùng icon: `CheckCircle2` cho Tiếp nhận, Hoàn thành, Duyệt CV, Duyệt KQ trong cùng menu (`TaskCardMenu.tsx:82-107`); `Ban` cho cả "Từ chối nhận" và "Hủy công việc"; `ExternalLink` vừa là "xem nhanh" (tiêu đề QuickView) vừa là "mở file".
- **Đề xuất**: 3 cỡ icon: 14 (inline text-xs), 16 (mặc định), 20 (nav/header); hero 24; stroke 1.75 thống nhất.

---

## 20. Vị trí thành phần

| Thành phần | Dashboard | Danh sách task | Chi tiết task | QuickView | Sheet |
|---|---|---|---|---|---|
| Breadcrumb | không | không | không (chỉ "← Quay lại") | – | – |
| Tiêu đề trang | trái, trong content | trái, kèm icon | trong hero (sau mã) | trong card hero | header sheet |
| Nút hành động chính | – | phải header ("Tạo công việc") | khung giữa hero + "Chỉnh sửa" góc phải trên | footer cố định | footer phải |
| Bộ lọc | không có (dashboard không lọc kỳ) | hàng riêng dưới header; sort lại nằm trên header | – | – | – |
| Phân trang | – | dưới cùng, card riêng | – | – | – |
| Nút đóng | – | – | – | header phải | Sửa: header phải; Tạo: không |

---

## 21. Code chết / trùng (ảnh hưởng DS)
- Không dùng: `TaskDetail/DetailPageHeader.tsx`, `TaskCard/PriorityBadge.tsx`, `modules/auth/components/LogoutButton.tsx`.
- Trùng: `getInitials` ×2, `formatSize` ×4, `DeadlineInfo` ×2, `getPolicyChecks` ×2, khối upload file (Complete/Supplement/Create/Edit) ×4, bảng status ×8, chip workflow ×3 (thẻ, QuickView, DetailPageHeader) + 1 kiểu khác ở DetailHero.

---

## 22. Đề xuất chuẩn hoá (đầu vào cho DS v2)

1. **Tokens**: `--background/foreground/muted/border` + semantic `primary (1 màu, chọn indigo hoặc blue)`, `success`, `warning`, `danger`, `info`, mỗi cái có `DEFAULT/foreground/subtle/subtle-foreground/border`; `--chart-1..8`; `--radius-*`; `--font-sans/mono`; `--shadow-sm/md/lg`; `--overlay`; z-index scale. Cấm `gray-*/slate-*/indigo-*` trực tiếp trong module (lint rule).
2. **Primitive mới**: `Card(Header/Title/Action/Content/Footer)`, `StatusBadge(status)`, `PriorityBadge(priority)`, `MetaChip`, `TaskCode`, `Tooltip`, `Tabs`, `Skeleton`, `EmptyState(icon,title,desc,action)`, `ErrorState(retry)`, `Spinner`, `FileItem(view/download luôn hiện)`, `AvatarGroup`, `SegmentedControl`, `FilterBar`, `PageHeader(title, desc, actions, breadcrumb)`, `ConfirmDialog` (thay 3 modal Confirm/Reason/Alert), `FormField(label, hint, error)`.
3. **Button**: variant `primary, secondary, outline, ghost, danger, success, warning, link`; size `xs 28, sm 32, md 36 (mặc định), lg 40`; `icon-*` tương ứng, **bắt buộc `aria-label`**; loading = spinner giữ nhãn (không đổi chữ).
4. **Dialog/Sheet**: 4 size, header trái (icon 40 + title + description), close "Đóng" chuẩn, footer *Hủy trái / Chính phải*; dark-mode qua token.
5. **Nội dung**: glossary (mục 16.1), sentence case toàn bộ, Việt hoá menu, map mã lỗi server → thông điệp tiếng Việt ở 1 chỗ (`lib/errors.ts`).
6. **Layout**: page padding 16/24; chi tiết task: ≥1280 3 cột, 1024–1279 2 cột (sidebar xuống dưới hoặc thành tab), <1024 1 cột + tabs; sheet form 1 cột <768.

---

## 23. DANH SÁCH MÀN HÌNH + TRẠNG THÁI CẦN PREVIEW

> Mỗi màn: **light + dark**, **1440 / 1280 / 1024 / 768 / 390 px**. Vai trò: **Admin/Boss** và **Nhân viên** (khác KPI, menu, ★, nút hành động).

### A. Khung app
1. Shell desktop — sidebar mở rộng / thu gọn (tooltip khi thu gọn) / mục cha đang mở (HR → Phân quyền 3 cấp; Settings nhiều nhóm).
2. Shell mobile — drawer mở, overlay, header có nút ☰.
3. Sidebar Boss có mục con ★ Quan trọng (badge 0 / 7 / 99+) và "Hoàn thành – chưa xem"; trạng thái thu gọn có badge đè icon.
4. Sidebar nhân viên khi đang tải quyền (menu hiện dần) và khi không có quyền Settings.
5. Header: user dropdown (tên dài 40 ký tự, ảnh avatar / chữ cái, 3 vai trò), ThemeToggle.
6. Notification dropdown: đang tải / rỗng / có chưa đọc (badge 1, 12, 99+) / nhóm Hôm nay–Hôm qua–Cũ hơn / item tiêu đề + message dài 3 dòng / loại không có icon / màn 360px.
7. Toast: success, error (thông điệp dài, thông điệp server tiếng Anh), warning "Phiên làm việc sắp hết hạn" (idle timeout).
8. Trang lỗi 404 / không có quyền / lỗi mạng (hiện chưa có trang riêng).

### B. Auth
9. Login: mặc định, đang đăng nhập, sai mật khẩu, lỗi hệ thống, mobile (không ảnh), dark.
10. Đổi mật khẩu lần đầu: trống (hiện yêu cầu), đang gõ (checklist đạt/chưa), không khớp, policy có ký tự đặc biệt, lỗi server, đang lưu.
11. Đặt lại mật khẩu: đang kiểm tra link, link hết hạn/không hợp lệ, form, thành công (đếm ngược chuyển trang).
12. Xác nhận email: đang xử lý, thành công, 3 loại lỗi (missing_token, invalid_or_expired, email_changed), lỗi không xác định.

### C. Dashboard
13. Boss: đủ dữ liệu; nhân viên: đủ dữ liệu (nhãn KPI khác).
14. Skeleton; lỗi tải (cần nút thử lại).
15. Dữ liệu rỗng hoàn toàn (tháng đầu): mọi panel empty, chart toàn 0, SLA "—".
16. KPI cực trị: 0, 1.234 (số lớn), SLA 100% / 59% (đỏ) / 75% (cam); Quá hạn 0 (xanh) vs >0 (đỏ).
17. Panel Cần duyệt: có gia hạn chờ (pill "N gia hạn"), item quá hạn / hôm nay / còn N ngày, tiêu đề dài, không ưu tiên.
18. Performance chart: 7 ngày / 30 ngày / đang tải / không dữ liệu.
19. Donut: 1 lát duy nhất, 7 lát, nhãn dài.

### D. Danh sách công việc
20. Mặc định (Chưa hoàn thành), Boss smart-sort; nhân viên sort Mới nhất.
21. View "★ Quan trọng"; view "Hoàn thành – chưa xem" (ô trạng thái khoá, nút "Đánh dấu đã xem tất cả", thẻ viền emerald + chip "Mới hoàn thành").
22. Thanh lọc: đang có nhiều lọc (cần chip + Xoá lọc), lọc ngày tuỳ chọn từ–đến, preset Quá hạn.
23. Loading (skeleton thẻ), Error (retry), Empty × 3 biến thể (chưa có dữ liệu / không khớp lọc / view ★ hoặc chưa xem rỗng).
24. Lưới ở 5 breakpoint (1→4 cột), phân trang: 1 trang, 7 trang, 50 trang (dấu …), đổi 10/20/50/100.
25. **Thẻ task** – ma trận: 7 trạng thái × 2 workflow; Force; nguồn Helpdesk (mã HD-xxx); ★ bật/tắt (hover/touch); có gia hạn chờ; có bình luận + mention (chấm đỏ); 0 / 1 / 3 / 8 người thực hiện (+N, tooltip); tiêu đề 1 dòng / rất dài không dấu cách / URL; loại công việc tên dài; 4 mức ưu tiên (+ màu ưu tiên tuỳ chỉnh); hạn: quá hạn / hôm nay / 2 ngày / 6 ngày / 30 ngày / đã hoàn thành / đã hủy.
26. Menu ⋯ của thẻ: tập quyền tối đa (Boss trên task Chờ duyệt có gia hạn), nhân viên (Tiếp nhận, Từ chối nhận), task Đã hủy (Khôi phục).

### E. Chi tiết công việc
27. Mỗi trạng thái (7) với vai trò người tạo / người thực hiện / Boss — khối nút hành động khác nhau (0 nút → 6+ nút wrap).
28. Mô tả: rỗng, ngắn, dài (Xem toàn bộ / Thu gọn), có list/đậm/nghiêng.
29. Tiến trình: IMMEDIATE vs NEED_APPROVAL ở từng bước; task Đã hủy (hiện ẩn).
30. Sidebar: không file / nhiều file đủ loại / tên file dài; 0, 1, 5 người thực hiện; người có nhiều phiên bản báo cáo (v1.0, v1.1, v2.0) mở/đóng; nguồn Helpdesk.
31. Tab Bình luận: loading, rỗng, nhiều, có mention, đang sửa, đã xoá, đã chỉnh sửa, task Hoàn thành (khoá nhập + thông báo lý do).
32. Tab Gia hạn: rỗng, 5/5 đơn, đơn chờ (Boss thấy "Xem xét"; người xin thấy ✕ rút), đã duyệt + phản hồi, bị từ chối.
33. Cột Lịch sử: rỗng, 50+ dòng, các loại action (đổi người, đổi hạn, gia hạn…).
34. Loading trang; không tìm thấy; không có quyền; lỗi mạng (tách riêng).
35. Responsive 1280 / 1024 / 768 / 390 (cần thiết kế lại bố cục).
36. ReportDialog: báo cáo ngắn, rất dài (cuộn), nhiều file, không nội dung.

### F. Xem nhanh (Sheet)
37. Loading, lỗi, đầy đủ; footer hành động 0 / 1 / nhiều nút; task Helpdesk; mô tả dài (line-clamp).
38. Bình luận trong QuickView: thu gọn "Xem tất cả N", trả lời (@), bỏ trả lời.
39. Mobile 390px (full màn).

### G. Tạo / Sửa công việc
40. Tạo — nhân viên (không ★/Force) và Boss (có ★, Force); chọn Trực tiếp / Phê duyệt.
41. Tạo — lỗi validate tất cả trường, lỗi server, đang tạo; đính kèm 0 / 5 file / vượt giới hạn / sai định dạng; modal dán ảnh.
42. Sửa — đang tải, không tìm thấy, người thực hiện bị khoá (đã làm), file cũ đánh dấu xoá + file mới, tiêu đề dài trong header, chế độ quy trình bị khoá.
43. Đóng khi có dữ liệu chưa lưu (cần thiết kế xác nhận).
44. Mobile 390px (1 cột).

### H. Modal hành động (mỗi cái: mặc định, lỗi validate, đang xử lý, mobile)
45. Xác nhận: Tiếp nhận, Duyệt công việc, Duyệt kết quả, Khôi phục.
46. Lý do: Từ chối công việc (plan), Từ chối nhận, **Hủy công việc** (kiểm tra nhãn nút).
47. Báo cáo hoàn thành: có/không mẫu, chọn mẫu, <10 ký tự, có file, dán ảnh.
48. Bổ sung báo cáo.
49. Yêu cầu làm lại: 1 người (không "Tất cả"), nhiều người, bỏ chọn hết, thiếu lý do từng người, báo cáo có file.
50. Chuyển giao: danh sách người rỗng / đang tải / thiếu ghi chú.
51. Giao lại (khi tất cả từ chối): chọn nhiều người, danh sách dài cuộn.
52. Xin gia hạn: ngày tối thiểu, thiếu lý do, đã đủ 5 lần.
53. Duyệt gia hạn: lý do dài, có/không ghi chú, đang xử lý.
54. Dialog xác nhận xoá bình luận / rút gia hạn (chưa có — cần thiết kế).

### I. Thành phần dùng chung cần bảng mẫu (component sheet)
55. Button: mọi variant × size × trạng thái (hover/focus/disabled/loading) + icon-only có tooltip.
56. Badge trạng thái task (7), trạng thái người thực hiện (≥8: chờ tiếp nhận, đang làm, hoàn thành, từ chối, hủy, cần sửa…), trạng thái gia hạn (3), ưu tiên (4 + màu tuỳ chỉnh), workflow (2), cờ Force/Helpdesk/★/Mới hoàn thành, vai trò (3).
57. Input/Select/Textarea/Date/Checkbox/Switch/Rich text: mặc định, focus, lỗi, disabled, có icon.
58. Avatar 4 cỡ + nhóm (+N) + viền trạng thái; tooltip danh sách.
59. Card, EmptyState, ErrorState, Skeleton (thẻ task, dòng list, KPI, chart), Spinner.
60. FileItem: pdf/ảnh/excel/docx/pptx/khác, tên dài, xem/tải luôn hiện.
61. Tabs, SegmentedControl (7/30 ngày), Pagination, FilterBar + chip.
62. Typography scale + màu chữ trên nền light/dark; bảng màu semantic + chart palette.

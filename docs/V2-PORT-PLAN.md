# Kế hoạch V2: tách UI/UX trước, logic sau

Ngày lập: 22/10/2026.
Chủ dự án chốt: **làm UI/UX trước, giữ nguyên nghiệp vụ V1. Thay đổi logic để sang Phase B.**

Nguồn tham chiếu:
- `docs/previews/ds-v2/`: preview giao diện, `_SPEC.md`, `copy.js` (song ngữ), `_GAP-code-vs-preview.md` (đối chiếu với code thật).
- Quy tắc dự án: `CLAUDE.md`. Không sửa bảng cũ; TDD; E2E; DoD; deploy qua GitHub bằng `update-techops.ps1`.

---

## PHASE A — UI/UX (giữ nguyên nghiệp vụ V1)

**Định nghĩa:** chỉ thay giao diện, bố cục, chữ, màu và song ngữ. Không đổi:
- ai được làm gì;
- trạng thái và bước chuyển;
- điều kiện hiện nút, giới hạn số;
- email và thông báo;
- API và schema.

Lát nào đụng tới một trong các điểm trên thì chuyển sang Phase B.

### A0. Chốt preview theo đúng V1 (trước khi port)

| # | Việc |
|---|---|
| A0.1 | **Sửa preview cho khớp hành vi V1** ở những chỗ đang lệch (xem `_GAP` mục 12–14): |
| | - Lý do từ chối/hủy theo luật của code. |
| | - Xin gia hạn chỉ người làm, chỉ ở chế độ Phê duyệt. |
| | - Bổ sung báo cáo chỉ ở chế độ Phê duyệt. |
| | - Hủy / Khôi phục / Giao lại theo đúng code. |
| | - Nhân viên xem được việc Đã xong của mình. |
| | - Trạng thái người làm theo code. |
| | - Mã việc dạng `26-0001`. |
| | - Nhắc hạn trước 3 ngày lúc 08:00. |
| | - Digest gửi Boss. |
| A0.2 | **Bổ sung giao diện cho tính năng V1 đang có mà preview thiếu:** |
| | - Vai trò Admin tách khỏi Boss trong preview (3 vai trò như V1). |
| | - Giao lại khi tất cả từ chối. |
| | - Xem việc Đã hủy. |
| | - Bộ lọc Loại / Nguồn / Thời gian + phân trang. |
| | - "Đánh dấu đã xem tất cả". |
| | - Chọn mẫu hoàn thành + dán ảnh + luật tệp trong hộp báo cáo. |
| | - Cảnh báo sắp hết phiên. |
| | - Boss được giao việc thì có thao tác của người làm. |
| | - Từ chối việc được chuyển giao thì trả về người chuyển. |
| | - Menu được cấp riêng cho nhân viên. |
| | - Trang Research. |
| A0.3 | **Đánh dấu "Để Phase B"** cho phần preview cần backend mới hoặc đổi logic: |
| | - Cột vai trò Manager. |
| | - Quyền công việc riêng theo người (V1 chưa có hiệu lực). |
| | - Quyền menu theo vai trò. |
| | - Xuất Excel danh sách việc và nhật ký. |
| | - Khoá bình luận khi việc xong. |
| | - "Nhiều thiết bị". |
| | - Bản nháp, nếu V1 chưa có luồng tạo DRAFT. |
| | Trong preview vẫn giữ để tham khảo, nhưng gắn nhãn rõ ràng. |

### A1. Nền giao diện

| # | Việc |
|---|---|
| A1.1 | Token màu sáng/tối, bo góc, bóng, khoảng cách: chuyển từ `app.css` sang `globals.css` (`@theme` + `.dark`). |
| A1.2 | Font: `next/font` (Lexend, Noto Sans, JetBrains Mono), subset `vietnamese`, tự host. |
| A1.3 | Song ngữ: script chuyển `copy.js` thành `messages/vi.json` + `en.json`; nút chuyển ngôn ngữ. Dịch lỗi server ở một chỗ (`lib/errors.ts`). |
| A1.4 | Component dùng chung: Button, Input, Select, Dialog, Drawer, Menu, Tabs, Segmented, StatusDot, PriorityFlag, DueText, Block, KvGrid, SummaryBar, DataTable, Pagination, EmptyState, Skeleton, ConfirmDialog, StickySaveBar, QuickMenu. Bỏ `window.confirm`. |
| A1.5 | Khung app: Sidebar, Topbar, chuông thông báo, menu người dùng, breadcrumb, ngăn kéo mobile, trang lỗi. |

### A2. Công việc (ưu tiên cao nhất)

| # | Việc |
|---|---|
| A2.1 | Chi tiết việc dùng chung cho ngăn trượt và trang `/tasks/[id]`. |
| A2.2 | Hộp thoại các hành động hiện có. Gọi đúng API V1, giữ nguyên điều kiện. |
| A2.3 | Danh sách: cột Mã/Ưu tiên, menu ⋯ (chỉ hiện hành động V1 cho phép), bộ lọc, phân trang. |
| A2.4 | Bảng Kanban: kéo thả có kiểm soát, chỉ gọi các hành động V1 sẵn có. |
| A2.5 | Tạo/Sửa: ngăn trượt + trang đầy đủ. Phần nháp tuỳ theo A0.3. |
| A2.6 | E2E cho từng luồng chính. |

### A3. Các trang còn lại (thứ tự)

1. Tổng quan
2. Thông báo + Hồ sơ
3. Helpdesk (gắn lại màn Import đã có code)
4. Nhân sự + Phân quyền (giao diện cho quyền menu theo người như V1)
5. Báo cáo (+ Research)
6. Nhật ký
7. Cài đặt
8. Đăng nhập / Mật khẩu

### A4. Hoàn thiện

- Rà a11y, dark mode, hiệu năng.
- Dọn code chết.
- Cập nhật docs.

**Cách làm (chốt 23/10/2026):**
- Mỗi lát là 1 nhánh `feat/v2-…`, xong thì gộp vào nhánh tích hợp **`v2/phase-a`**.
- `main` giữ nguyên = Prod cho tới khi xong cả Phase A.

| | Mỗi lát | Cuối Phase A |
|---|---|---|
| TDD (lát có logic/hành vi) | ✓ | |
| tsc + vitest (không tăng 16 lỗi sẵn có) | ✓ | ✓ |
| E2E | ✓ trên `next dev` | ✓ trên bản Docker |
| Docker build + `/api/health` | | ✓ |
| Deploy Prod (`update-techops.ps1`) | | ✓ |

Lý do: build Docker trên Windows rất lâu.

**Tiến độ:**
- A0 xong.
- A1-1 (token màu + font + theme) xong 23/10. Thay đổi nhìn thấy còn nhỏ vì các màn vẫn viết cứng ~1.100 lớp màu; sẽ ra tông V2 khi làm A1-4 và A2/A3.
- A1-2 (bộ component dùng chung) xong 23/10, nhánh `feat/v2-a1-components`: `src/shared/ui` (StatusDot, PriorityFlag, DueText, Block/Card, KvGrid, SummaryBar, DataTable, Pagination, EmptyState/ErrorState/Skeleton, ConfirmDialog `useConfirm`, StickySaveBar, QuickMenu, FilterChip; nhãn/màu trạng thái ở `status-meta.ts`) + `components/ui` (Button/Badge thêm biến thể, Tabs gạch chân, Segmented). Bỏ 3 `window.confirm` ở Cài đặt. Trang demo dev `/dev/ui` (404 ở production).
- A1-3 (song ngữ + dịch lỗi) xong 23/10, nhánh `feat/v2-a1-i18n`: next-intl đọc cookie `NEXT_LOCALE` (`vi` mặc định, không đổi URL; `src/i18n/config.ts` + plugin trong `next.config.mjs`), `<html lang>` theo locale. `messages/*.json` sinh bằng `npm run i18n:build` từ `copy.js` (chỉ nhóm khung/dùng chung — danh sách ở `INCLUDE` trong `scripts/i18n/build-messages.mjs`) + `scripts/i18n/extra-messages.mjs` (`ui.*`, `err.*`, khoá cũ); xung đột `a`/`a.b` → `a._`; `npm run i18n:check` kiểm vi/en. Format ngày/số: `src/i18n/format.ts` / `useFormat()`. Lỗi: `src/lib/errors.ts` (`toUserMessage`) + `useErrorMessage()`, đã thay 53 chỗ `toast.error(…message)`. Nút đổi ngôn ngữ tạm ở menu người dùng (A1-4 dựng lại). Khi port màn nào thì thêm tiền tố khoá của màn đó vào `INCLUDE`.
- A2-1 (chi tiết công việc: trang + ngăn xem nhanh dùng chung) xong 23/10, nhánh `feat/v2-a2-detail`: `components/TaskDetail/` dựng lại theo `task.html` (thanh tóm tắt 6 ô, Hành trình có ngày + "Đang ở chỗ …", cụm nút gọn, khối Mô tả/Kết quả/tabs, cột phải Tệp/Helpdesk/Thông tin thêm; ≤680 thanh hành động dính đáy). `TaskDetailDrawer` thay `TaskQuickViewSheet` (đã xoá thư mục TaskQuickView). Quyền/hộp thoại giữ V1 (`TaskActionModals`). i18n thêm nhóm `td` (trừ `td.pv.*`, `td.cm.lock*`) + `tdx.*` ở extra-messages. E2E `e2e/task-detail-v2.spec.ts`.
- A2-2 (hộp thoại hành động) xong 23/10, nhánh `feat/v2-a2-actions`: khung dùng chung `src/shared/ui/ActionDialog.tsx` (tiêu đề + phụ đề, thẻ tóm tắt việc `.tk`, footer [Đóng][chính], `danger`, `pending`, focus ô đầu, ≤680 trượt đáy + nút 44px, `DialogNote` `.note/.warn/.bad`) + `Field.tsx` (nhãn trên, lỗi inline dưới, aria). 10 modal trong `actions/components/modals/` + `ReportDialog` chuyển sang khung mới, song ngữ; luật kiểm tra V1 gom ở `action-dialog-rules.ts` (có test), hộp Báo cáo/Bổ sung dùng `ReportFormDialog` + `AttachmentField` (mẫu hoàn thành, kéo thả/dán ảnh, luật tệp V1). Payload/endpoint giữ nguyên (test `action-modals.test.tsx`). i18n thêm `tf.att.*`, `tf.paste.*` + `tdx.dlg.*`. E2E `e2e/task-actions-v2.spec.ts` (chạy `--output` ra ngoài repo: ghi vào `e2e/.results` làm next dev biên dịch lại giữa chừng).
- A2-3 (danh sách công việc) xong 23/10, nhánh `feat/v2-a2-list`: `components/TaskList/` dựng lại theo `tasks-list.html` (bảng Mã/Công việc/Ưu tiên/Người làm/Trạng thái/Hạn/⋯ trên `DataTable`, ≤680 dòng 3 tầng; tab Đang mở · Quan trọng · Mới xong · Đã xong · Đã hủy ánh xạ vào tham số V1 `view`/`status`; bảng lọc + chip + Xóa bộ lọc; sắp xếp V1 + bấm cột Hạn/Trạng thái; phân trang server 10/20/50/100). URL/payload API giữ V1 (`list-logic.ts`, test đối chiếu V1); menu ⋯ = đúng hành động menu thẻ V1 (`quickMenuKeys`). Sửa hydration: `Badge` thành `<span>` (cả `/hr/users`). Xoá `TaskCard/` + `useTaskCardActions`. Phase B: tab "Cần tôi xử lý" + dải "đang chờ bạn", sắp theo Ưu tiên, nút Xuất Excel. i18n thêm nhóm `tl` + `tlx.*`. E2E `e2e/task-list-v2.spec.ts`.
- A2-4a (bảng Kanban) xong 23/10, nhánh `feat/v2-a2-board`: `TaskList/TaskBoard` theo `tasks-board.html` (5 cột quy trình, + Đã hủy khi lọc Tất cả; thẻ gọn mã/★/chưa xem/⋯/tiêu đề/loại·ưu tiên/người làm/hạn + nút hành động đến lượt mình), `?mode=board` + cookie nhớ chế độ, dùng chung tab/bộ lọc/tìm kiếm/menu ⋯/hộp thoại với Danh sách. Dữ liệu: mỗi cột 1 lần gọi API danh sách V1 (20/cột, Xem thêm tới 100). Kéo thả Pointer Events thuần (không thêm thư viện): chỉ tiến 1 bước theo quyền V1 (`board-logic.ts` `dropActionFor`, test đối chiếu V1), thả → hộp thoại A2-2, đóng → về chỗ cũ; tắt ≤680. Chưa làm: dải quy trình đếm "chờ bạn" của preview, nhấc thẻ bằng phím Space. i18n thêm nhóm `dnd` + `tbx.*`. E2E `e2e/task-board-v2.spec.ts`.
- A2-4b (Tạo / Sửa công việc) xong 23/10, nhánh `feat/v2-a2-form`: `components/TaskForm/` — một biểu mẫu dùng chung cho ngăn trượt phải (Tạo từ Danh sách/Bảng, Sửa từ Danh sách/chi tiết) và trang đầy đủ `/tasks/new` (route mới, chỉ UI; `?draft=<id>`, `?from=panel`). Nghiệp vụ V1 giữ nguyên (`form-logic.ts`: chạy đúng zod `create/update-task.schema`, tiêu đề tạo 150 / sửa 255, body POST/PATCH đối chiếu `__tests__/v1-form.fixture.ts`; người đã nhận + người tạo khoá khi Sửa; đổi chế độ khi Sửa chỉ nhân viên + Chờ duyệt; ★/Bắt buộc chỉ Boss/Admin; tệp qua `AttachmentField` + `/api/upload` như V1). Nháp (Phase B) CHỈ localStorage (`draft-store.ts`, khoá `techops.taskDrafts:<userId>`, có version, không lưu tệp), tab "Nháp trên máy này" ở Danh sách; đóng ngăn Tạo khi có thay đổi → [Bỏ][Tiếp tục sửa][Lưu nháp], ngăn Sửa → [Bỏ thay đổi][Tiếp tục sửa]. Xoá `CreateTask/*` (trừ `attachment-rules`, `usePasteImage`, `useRichEditor`) và `TaskModals/`. i18n thêm nhóm `tf`, `dr` + `tfx.*`. E2E `e2e/task-form-v2.spec.ts`.
- A3-2 (Thông báo + Hồ sơ) xong 23/10, nhánh `feat/v2-a3-2`: trang mới `/notifications` (route chỉ UI, theo `notifications.html`: tab Tất cả/Chưa đọc = `unreadOnly`, nhóm Hôm nay/Hôm qua/Cũ hơn theo giờ VN, Xem thêm 20/trang, đánh dấu 1 / tất cả, rỗng/đang tải/lỗi) + chân chuông "Xem tất cả"; chỉ dùng API V1, mở chuông vẫn đọc hết như V1. `/settings/profile` dựng lại theo `profile.html` (`settings/components/profile/`): khối Tài khoản/Ảnh (lưu ngay)/Cơ bản/Liên hệ/Múi giờ + ngôn ngữ (client)/Mật khẩu (hộp thoại có danh sách yêu cầu từ `/api/auth/password-policy`), 1 StickySaveBar, lỗi dưới ô; body PATCH giữ 2 kiểu V1 (`profile-form.ts`, zod dùng chung `validators/profile.schema.ts`). Sửa lỗi V1: tải ảnh đại diện báo lỗi dù đã lưu (bỏ PATCH `avatarUrl` thừa). Phase B: lọc theo loại thông báo, câu thông báo song ngữ có tên người, xác nhận email, bỏ ảnh, ngày đổi mật khẩu. `/settings/security` + `/settings/notifications` để lát Cài đặt. i18n thêm nhóm `nt`, `pf`, một phần `au` + `ntx.*`, `pfx.*`. E2E `e2e/notifications-profile-v2.spec.ts`.
- A3-1 (Tổng quan) xong 23/10, nhánh `feat/v2-a3-1`: `modules/dashboard` dựng lại theo `dashboard.html` (lời chào + dòng "đang chờ bạn" = tổng ô KPI 3+4; 6 ô chỉ số 1 khối; Cần bạn xử lý · Sắp đến hạn · Bình luận gần đây · Hiệu suất 7/30 ngày (recharts, đường) · Trạng thái/Ưu tiên + Quy trình tháng này (thanh xếp chồng thay biểu đồ tròn) · Cập nhật gần đây; lưới 3 → 2 → 1 cột; đang tải/rỗng/lỗi). Dữ liệu = API V1 không đổi (`/api/dashboard/stats` cache 5 phút, `/performance`); level ưu tiên lấy thêm từ `GET /api/settings/priorities` có sẵn. Bấm việc → `TaskDetailDrawer` (‹ › theo khối). Logic thuần `view-model/dashboard-logic.ts` (có test). Phase B: danh sách từng đơn gia hạn, dòng sự kiện cuối ở Cập nhật gần đây, tab "Cần tôi xử lý", xoá cache khi việc đổi. i18n thêm nhóm `db` (trừ `db.pv.*`). E2E `e2e/dashboard-v2.spec.ts`.
- A3-3 (Helpdesk + Nhập dữ liệu) xong 24/10, nhánh `feat/v2-a3-3`: `/helpdesk` dựng lại theo `helpdesk.html` (`helpdesk/components/HelpdeskPage/`): bảng `DataTable` Ticket (tiêu đề + mã, cờ Khẩn/Cao, “cần chú ý”, “đã tạo công việc”) · Người yêu cầu · Trạng thái Helpdesk (dịch từ giá trị gốc Anh/Việt) · Người xử lý · Ngày tạo; ô tìm + hộp “Lọc ticket” + chip; phân trang server 10/25/50/100; ngăn chi tiết (Boss/Admin: [Xoá] [Tạo công việc] = “Gán người” V1); thanh hàng loạt Gán/Xoá; khu đồng bộ (lần cuối từ lịch sử, Lấy dữ liệu ngay, Lịch tự động, Lịch sử); menu ⋯ (Lịch, Lịch sử, Admin: Đặt lại dữ liệu OTP). Gắn lại Nhập dữ liệu (`ManualImportCard` + “Get từ API” V1) thành hộp 2 bước Chọn nguồn → Kết quả, nhập ngay như V1. URL/body giữ V1 (`hd-logic.ts`, đối chiếu `__tests__/v1-helpdesk.fixture.ts`). Nhân viên chỉ xem (V1 hiện nút nhưng API từ chối). Sửa lỗi V1: gán/xoá hàng loạt báo thành công dù HTTP lỗi. Phase B: nút "Đẩy tất cả sang công việc" (API V1 có sẵn nhưng V1 không gắn nút — user chốt 24/10 để Phase B), tab Cần chú ý/Chưa tạo/Đã tạo + đếm, xem trước khi nhập (chạy thử), tạo việc cho riêng ticket đã chọn, chọn sẵn người theo IT Support, liên kết sang công việc đã tạo. Xoá `sections/*`, `components/{admin,import,modals,sync,tickets}`. `DataTable` thêm `rowClassName`. i18n thêm nhóm `hd` + `hdx.*`. E2E `e2e/helpdesk-v2.spec.ts` (Helpdesk/sync/cron/reset đều qua `page.route`, không gọi hệ thống thật).
- A3-4 (Nhân sự + Phân quyền) xong 24/10, nhánh `feat/v2-a3-4`: `/hr/users` dựng lại theo `people.html` (`hr/users/components/People/`: tab Người dùng · Phân quyền, hàng lọc tìm/vai trò/trạng thái/ngày tạo (V1), thanh hàng loạt 4 thao tác V1, bảng DataTable + menu ⋯ đúng quyền V1, ngăn chi tiết có Lịch sử thay hộp Lịch sử, hộp Tạo/Sửa/Đặt lại mật khẩu V2; Khoá/Mở khoá nay hỏi xác nhận). `/hr/permissions` theo `permissions.html` phần "Theo người dùng" (danh sách nhân viên + khối menu có công tắc, thanh Lưu gom thay đổi → 1 PUT cùng body V1; trang con V1 `/hr/permissions/{logs,users,…}` thành bộ lọc menu). Logic thuần `hr/users/view/*`, `hr/permissions/view/perm-logic.ts` (test đối chiếu V1). `/hr/users/[id]/permissions` vẫn 404. Nhãn vai trò `ppx.role.*` = ROLE_LABELS (BOSS "Quản lý"). Phase B: phân quyền theo vai trò, quyền công việc riêng (override), Phòng ban/Chức danh/Đăng nhập cuối, trạng thái Chờ kích hoạt, "Về mặc định". i18n thêm nhóm `pp` (trừ `pp.pv.*`) + `ppx.*`. E2E `e2e/hr-permissions-v2.spec.ts`.

---

## PHASE B — Logic (làm sau Phase A)

### Vai trò đã chốt hướng (22/10/2026)

| Mã | Hiển thị | Vai trò |
|---|---|---|
| ADMIN | Quản trị viên | Chỉ lo hệ thống |
| MANAGER *(mới)* | Manager | Cấp trên. Xem mọi việc và báo cáo, thao tác khi cần, chỉ nhận digest hằng ngày |
| BOSS | Vice Manager | Người duyệt chính (Cao Thuận), nhận thông báo duyệt |
| EMPLOYEE | Nhân viên | Như V1 |

### Việc của Phase B

| # | Việc |
|---|---|
| B0 | Sửa lỗi tạo việc chế độ Phê duyệt bị chậm (gửi email nền, dùng lại kết nối SMTP, đặt timeout). Đây là bug, có thể làm sớm nếu được duyệt riêng. |
| B1 | Gom ~140 chỗ viết cứng `'ADMIN'/'BOSS'` về `lib/roles.ts`. Giữ nguyên hành vi, có test bao quanh. |
| B2 | Thêm MANAGER: seed + đổi nhãn BOSS thành "Vice Manager", không đổi schema. |
| B3 | Các câu Q4–Q21 trong `_GAP-code-vs-preview.md`. Đề xuất mặc định nằm ở bảng dưới, **chưa duyệt**. |
| B5 | **Sau Phase B:** sửa xuất PDF ở Báo cáo (container thiếu Chrome — Dockerfile đặt `PUPPETEER_SKIP_DOWNLOAD`), nâng Node 22 → 24. |
| B4 | Tính năng mới cần backend: xuất Excel danh sách việc và nhật ký, khoá bình luận, nhiều thiết bị, bản nháp (nếu cần), ma trận quyền theo vai trò, bật lại quyền công việc riêng. |

#### Đề xuất mặc định cho B3 (chờ duyệt ở Phase B)

| # | Đề xuất |
|---|---|
| Q4 | Bật lại quyền công việc riêng theo người. |
| Q5 | Quyền menu: mặc định theo vai trò, cộng ngoại lệ theo người. |
| Q6 | Research thành tab thứ 3 của Báo cáo. Tab này làm luôn ở Phase A vì chỉ là giao diện. |
| Q8 | V2: Kanban, trang Thông báo. V2.1: xuất Excel, khoá bình luận. |
| Q9 | Bộ nhãn mới. Chỉ là chữ nên làm luôn ở Phase A. |
| Q12 | Giao lại: Manager/Vice Manager + người tạo. Khôi phục: chỉ Admin. |
| Q13–Q15 | Giữ như code. |
| Q16 | Giữ `26-0001`. |
| Q18 | Digest gửi Manager + Vice Manager. |
| Q19 | Ẩn "nhiều thiết bị". |
| Q20 | Không làm bulk action trên danh sách việc. |
| Q21 | Giữ song ngữ. Làm ở Phase A (A1.3). |

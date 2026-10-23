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

**Mỗi lát là 1 nhánh.** Phải đạt DoD (vitest, tsc, E2E, docker build, `/api/health`) rồi mới deploy.

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

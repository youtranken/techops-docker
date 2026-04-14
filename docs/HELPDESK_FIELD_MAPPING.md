# Helpdesk API ↔ TechOps Field Mapping

## Field Mapping

| Field API Helpdesk | Key thực tế trong JSON | Field nội bộ (HelpdeskTicket) | Lưu vào DB (HelpdeskPendingTask / Task) | Ghi chú |
|---|---|---|---|---|
| `Code` | `Code` | `code` | `hdId`, `hdCode` (= `API-{code}`) | Mã ticket duy nhất |
| `Ngày tạo` | `Ngày tạo` *(hoặc `Ng?y t?o` nếu encoding lỗi)* | `ngayTao` | `thoiGian` / `scheduleStart` | Ngày tạo ticket |
| `Nhân viên` | `Nhân viên` | `nhanVien` | `nhanVien` / `hdNhanVien` | Người yêu cầu |
| `Phòng ban` | `Phòng ban` | `phongBan` | `phongBan` / `hdPhongBan` | Phòng ban yêu cầu |
| `Tiêu đề` | `Tiêu đề` *(hoặc `Ti?u d?`)* | `tieuDe` | `tieuDe` / `title` | Tiêu đề ticket / Task |
| `Loại yêu cầu` | `Loại yêu cầu` *(hoặc `Lo?i y?u c?u`)* | `loaiYeuCau` | `loaiYeuCau` | Map sang `TaskType` khi tạo Task |
| `Ưu tiên` | `Ưu tiên` *(hoặc `Uu ti?n`)* | `uuTien` | `uuTien` | Map sang `Priority` khi tạo Task |
| `Diễn giải` | `Diễn giải` *(hoặc `Di?n gi?i`)* | `dienGiai` | `dienGiai` / `content` | Nội dung chi tiết |
| `Trạng thái` | `Trạng thái` *(hoặc `Tr?ng th?i`)* | `trangThai` | `trangThai` | Xem bảng trạng thái bên dưới |
| `IT Support` | `IT Support` | `itSupport` | `itSupport` / `TaskAssignee.userId` | Match theo `User.displayName` |
| `TimeStamp` | `TimeStamp` | `timeStamp` | `ngayHoanThanh` / `scheduleEnd` / `completedAt` | Ngày hoàn thành, có thể null |

> **Lưu ý encoding:** API trả về JSON với encoding Windows-1252. Khi paste qua Postman → browser,
> một số ký tự tiếng Việt bị corrupt thành `?`. `normalizeTicket()` xử lý cả hai dạng
> bằng fuzzy matching (strip non-ASCII rồi so sánh).

---

## Mapping Trạng thái

| Trạng thái API (`trangThai`) | Ý nghĩa | Hiển thị trong Helpdesk | Đẩy sang Task? | Task status |
|---|---|---|---|---|
| `Completed` | Đã xử lý hoàn thành | ✅ Hiển thị | ✅ Có | `COMPLETED` |
| `Approved` | Đã được duyệt | ✅ Hiển thị | ❌ Không | — |
| `Rejected` | Bị từ chối | ✅ Hiển thị | ❌ Không | — |
| `Closed` | Đã đóng / Hủy ticket | ✅ Hiển thị | ❌ Không | — |

---

## Flow xử lý khi Import JSON

```
Import JSON (paste từ Postman)
        │
        ▼
normalizeTicket()  ← fuzzy match key encoding
        │
        ├─ itSupport có giá trị?
        │       │
        │       ├── Có → Lưu HelpdeskPendingTask (status = UNASSIGNED, itSupport = ...)
        │       └── Không → Lưu HelpdeskPendingTask (status = UNASSIGNED, itSupport = null)
        │
        └─ Code trùng (hdId đã có trong HelpdeskPendingTask)? → SKIP (không import trùng)
```

## Flow "Đẩy sang Task"

```
Bấm "Đẩy sang Task"
        │
        ▼
Lấy tất cả HelpdeskPendingTask có:
  - trangThai = 'Completed'
  - itSupport != null
        │
        ├─ hdCode (API-{code}) đã tồn tại trong Task? → SKIP (trùng)
        │
        ├─ User với displayName = itSupport tìm thấy?
        │       ├── Có → Tạo Task COMPLETED + TaskAssignee COMPLETED
        │       └── Không → noUser++ (bỏ qua, không tạo Task)
        │
        └─ Ticket vẫn giữ nguyên trong Helpdesk để tham chiếu
```

---

## Mapping Priority (Ưu tiên)

| Giá trị API | Priority trong TechOps |
|---|---|
| `Khẩn cấp` | Khẩn cấp |
| `Cao` | Cao |
| `Bình thường` | Bình thường |
| `Thấp` | Thấp |

> Nếu không tìm thấy → dùng Priority `isDefault = true`

## Mapping TaskType (Loại yêu cầu)

| Giá trị API | TaskType trong TechOps |
|---|---|
| `Phần mềm` | Phần mềm |
| `Phần cứng` | Phần cứng |
| `Khác` | Khác |

> Nếu không tìm thấy → dùng TaskType đầu tiên trong DB

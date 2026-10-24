# Module: Helpdesk — Hướng dẫn cho AI Agent

## Mục đích

Tích hợp với Helpdesk API bên ngoài để đồng bộ ticket, quản lý danh sách ticket chờ xử lý, và tự động tạo Task khi ticket hoàn thành.

## Cấu trúc hiện tại

```
helpdesk/
  types.ts                              # Tất cả interfaces (HelpdeskTicket, SyncResult, HelpdeskPendingItem, PushResult, ...)
  index.ts                              # Barrel export

  services/
    ticket-normalizer.ts                # normalizeTicket() — parse raw API response
    ticket-processor.service.ts         # processTickets(), createTask(), createPendingTask(), createTaskFromPending()
    helpdesk-sync.service.ts            # fetchTickets(), sync(), syncFromData()
    helpdesk-pending.service.ts         # list(), filterOptions(), assign(), delete()

  hooks/
    useHelpdeskPending.ts               # useHelpdeskPending, useHelpdeskFilterOptions (URL từ hd-logic.pendingUrl)
    useHelpdeskMutations.ts             # gán / xoá 1 hoặc nhiều ticket (BulkError đếm cả HTTP lỗi)
    useHelpdeskSync.ts                  # useHelpdeskSync (POST /sync: không body = Get từ API, { manualData } = nhập JSON), useHelpdeskSyncLogs
    useHelpdeskCronConfig.ts            # lịch tự động 2 khung giờ
    useHelpdeskReset.ts                 # gửi OTP + đặt lại dữ liệu (chỉ ADMIN)
    useAssignableUsers.ts               # người nhận việc (/api/tasks/assignable-users)
    usePushToTasks.ts                   # đẩy tất cả ticket hoàn thành sang công việc

  components/HelpdeskPage/              # Trang /helpdesk V2 (A3-3, preview docs/previews/ds-v2/helpdesk.html)
    HelpdeskPage.tsx                    # ghép trang: đầu trang, khu đồng bộ, tìm + lọc, bảng, phân trang, hộp thoại
    hd-logic.ts                         # logic thuần: URL danh sách/xuất Excel, bộ lọc, chọn nhiều, lịch, nhập JSON, OTP
    __tests__/                          # hd-logic.test.ts + v1-helpdesk.fixture.ts (bản sao logic V1 để đối chiếu)
    HdTable.tsx · HdCells.tsx           # bảng ticket (DataTable) · trạng thái / cờ ưu tiên dịch từ giá trị gốc
    HdFilters.tsx · HdBulkBar.tsx       # ô tìm, hộp "Lọc ticket", chip · thanh hàng loạt
    HdSyncBar.tsx                       # khu đồng bộ (Boss/Admin)
    HdTicketDrawer.tsx                  # ngăn chi tiết ticket
    HdAssignDialog.tsx                  # gán người (1 ticket = "Tạo công việc" / hàng loạt)
    HdImportDialog.tsx                  # Nhập dữ liệu: Helpdesk API hoặc dán JSON → kết quả
    HdCronDialog.tsx · HdHistoryDrawer.tsx · HdResetDialog.tsx
    useHdActions.ts                     # đồng bộ, xuất Excel, gán/xoá, đẩy tất cả (+ xác nhận, thông báo)
```

## API Routes (src/app/api/integrations/helpdesk/)

| Route | Method | Mô tả |
|---|---|---|
| `/sync` | POST | Auto-sync từ API hoặc nhập manual JSON |
| `/unassigned` | GET | Danh sách ticket (hỗ trợ filter, pagination) |
| `/unassigned/[id]` | POST | Gán IT Support |
| `/unassigned/[id]` | DELETE | Xóa ticket khỏi danh sách |
| `/push-to-tasks` | POST | Đẩy ticket Completed sang Task |
| `/reset` | DELETE | Xóa hết dữ liệu (chỉ ADMIN, cần OTP từ `/reset/request-otp`) |
| `/cron-config` | GET/POST | Lịch tự động 2 khung giờ |

## Logic nghiệp vụ quan trọng

### Flow xử lý khi nhập JSON (manual import)

```
JSON input
  → syncFromData() [helpdesk-sync.service.ts]
    → normalizeTicket() [ticket-normalizer.ts]  — parse raw fields
    → processTickets(tickets, skipExisting=false) [ticket-processor.service.ts]
      → trangThai === 'Completed'?
        → Đã có Task? → upsert pending (status=PUSHED), skipped++
        → Có IT Support + tìm thấy user? → createTask() + createPendingTask(PUSHED), synced++
        → Không có IT Support? → createPendingTask(UNASSIGNED), pending++
        → Không tìm thấy user? → createPendingTask(UNASSIGNED), pending++
      → trangThai khác (Pending, Closed, ...) → createPendingTask(UNASSIGNED), pending++
```

### Status của HelpdeskPendingTask

| Status | Ý nghĩa |
|---|---|
| `UNASSIGNED` | Chờ gán IT Support hoặc chờ xử lý |
| `PUSHED` | Đã được tạo Task tương ứng |

### Ticket được hiển thị trong Danh sách

**Tất cả** records trong `HelpdeskPendingTask` đều hiển thị, kể cả `PUSHED`.
- Dòng `PUSHED`: chữ "✓ Đã tạo công việc" dưới tiêu đề, không có ô chọn, ngăn chi tiết không có nút.
- Dòng `UNASSIGNED` đã hoàn thành mà chưa có IT Support: nền đỏ nhạt + biểu tượng "Cần chú ý".
- Bấm dòng → ngăn chi tiết; Boss/Admin có [Xoá] và [Tạo công việc] (= "Gán người" V1). Nhân viên chỉ xem.

## Điểm cần lưu ý khi sửa code

### ticket-normalizer.ts
- Hỗ trợ field names có dấu tiếng Việt (Unicode) và không dấu
- Fuzzy matching: strip non-ASCII rồi so sánh — tránh lỗi encoding
- Không thay đổi logic fuzzy trừ khi hiểu rõ tại sao

### ticket-processor.service.ts
- `createTaskFromPending()` là **public** — được gọi từ `push-to-tasks/route.ts`
- `processTickets(skipExisting)`:
  - `true` (auto-sync): skip ticket đã có Task trong DB
  - `false` (manual): kiểm tra riêng trong nhánh Completed
- Khi tạo Task từ Completed: status = `COMPLETED`, completedAt = ticket.timeStamp

### helpdesk-sync.service.ts
- `fetchTickets()` tự động filter: chỉ lấy ticket có `code` bắt đầu bằng 2 chữ số cuối năm hiện tại ("26" cho 2026, "27" cho 2027...)
- `currentYearPrefix()` tự động theo năm thực tế — **không hardcode**
- Manual import (`syncFromData`) **không** áp dụng filter năm — nhập nguyên siều thô từ JSON

## Khi thêm tính năng

1. Thêm type vào `types.ts` trước
2. Logic nghiệp vụ → `ticket-processor.service.ts` hoặc `helpdesk-pending.service.ts`
3. API endpoint mới → tạo file trong `src/app/api/integrations/helpdesk/`
4. Hook mới → `hooks/useHelpdeskMutations.ts` hoặc file hook mới
5. UI mới → `components/HelpdeskPage/` (logic thuần vào `hd-logic.ts` + test đối chiếu V1)
6. Chạy `npx tsc --noEmit` verify

## Cron Job tự động (`src/lib/cron/helpdesk-sync.ts`)

| Thuộc tính | Giá trị |
|---|---|
| Schedule | `0 7 * * *` (7:00 AM mỗi ngày) |
| Kích hoạt | `CRON_HELPDESK_SYNC_ENABLED=true` trong `.env` |
| Gọi | `helpdeskSyncService.sync()` → fetch API → filter năm → processTickets |
| Đăng ký | `src/app/layout.tsx` — tương tự deadline-reminder cron |

**Lưu ý:** Cron chỉ chạy server-side (`typeof window === 'undefined'`). Trong môi trường dev, kiểm tra log của Next.js server để xác nhận cron đã start.

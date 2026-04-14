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
    useHelpdeskPending.ts               # useHelpdeskPending, useHelpdeskFilterOptions
    useHelpdeskMutations.ts             # useAssignHelpdesk, useDeleteHelpdesk
    useHelpdeskSync.ts                  # useHelpdeskSync
    usePushToTasks.ts                   # usePushToTasks

  components/
    import/ManualImportCard.tsx         # Card nhập JSON thủ công từ API
    sync/SyncStatusCard.tsx             # Card auto-sync
    tickets/
      HelpdeskTicketTable.tsx           # Bảng danh sách ticket
      HelpdeskTicketRow.tsx             # 1 hàng trong bảng
      StatusBadge.tsx                   # Badge trạng thái ticket + ưu tiên
    modals/
      AssignHelpdeskModal.tsx           # Modal gán IT Support

  sections/
    ImportSection.tsx                   # Wraps ManualImportCard
    PushToTasksSection.tsx              # Card đẩy ticket sang Task
    ResetSection.tsx                    # Card xóa dữ liệu test
    TicketListSection.tsx               # Filter bar + bảng + pagination

  mocks/
    helpdesk-mock-data.ts               # Dữ liệu mẫu để test
```

## API Routes (src/app/api/integrations/helpdesk/)

| Route | Method | Mô tả |
|---|---|---|
| `/sync` | POST | Auto-sync từ API hoặc nhập manual JSON |
| `/unassigned` | GET | Danh sách ticket (hỗ trợ filter, pagination) |
| `/unassigned/[id]` | POST | Gán IT Support |
| `/unassigned/[id]` | DELETE | Xóa ticket khỏi danh sách |
| `/push-to-tasks` | POST | Đẩy ticket Completed sang Task |
| `/reset` | DELETE | Xóa hết dữ liệu (chỉ dùng khi test) |

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
- Row `PUSHED`: nền xanh nhạt, badge "✓ Đã tạo Task", không có nút thao tác
- Row `UNASSIGNED`: bình thường, có nút "Gán người" và "Xóa"

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
5. UI mới → component trong `components/[domain]/`, section trong `sections/`
6. Chạy `npx tsc --noEmit` verify

## Cron Job tự động (`src/lib/cron/helpdesk-sync.ts`)

| Thuộc tính | Giá trị |
|---|---|
| Schedule | `0 7 * * *` (7:00 AM mỗi ngày) |
| Kích hoạt | `CRON_HELPDESK_SYNC_ENABLED=true` trong `.env` |
| Gọi | `helpdeskSyncService.sync()` → fetch API → filter năm → processTickets |
| Đăng ký | `src/app/layout.tsx` — tương tự deadline-reminder cron |

**Lưu ý:** Cron chỉ chạy server-side (`typeof window === 'undefined'`). Trong môi trường dev, kiểm tra log của Next.js server để xác nhận cron đã start.

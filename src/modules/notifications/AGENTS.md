# Notifications Module — Hướng dẫn cho AI Agent

## Mục đích

Thông báo trong ứng dụng (bảng `Notification`) + email kèm theo (gửi trong `notification.service.ts`, theo prefs ở module settings).

## Cấu trúc

```
notifications/
  services/notification.service.ts   # create (+ email), list(page, limit ≤50, unreadOnly), markAsRead, markAllAsRead, getUnreadCount
  hooks/useNotifications.ts          # chuông: danh sách trang 1, số chưa đọc (15s), đọc 1 / đọc hết
  hooks/useNotificationFeed.ts       # trang /notifications: useInfiniteQuery theo trang (khoá ['notifications','feed',tab])
  lib/group-by-day.ts                # groupByDay (chuông: Hôm nay/Trước đó), groupByDay3 (trang: Hôm nay/Hôm qua/Cũ hơn) — theo APP_TIMEZONE
  lib/notification-view.ts           # 14 loại V1 → nhóm (nt.cat.*), href /tasks/{id}, URL API, trang kế, gộp trang bỏ trùng
  components/NotificationBell.tsx    # nút chuông + popover; chân có "Xem tất cả" → /notifications
  components/NotificationDropdown.tsx, NotificationItem.tsx, notification-icon.tsx (icon/tông theo loại, dùng chung)
  components/NotificationsPage/      # trang /notifications (A3-2): tab Tất cả/Chưa đọc, nhóm theo ngày, Xem thêm, đánh dấu 1 / tất cả
```

## API (V1, không đổi)

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/notifications?page&limit&unreadOnly` | `limit` tối đa 50, chỉ của người đăng nhập |
| GET | `/api/notifications/unread-count` | |
| PATCH | `/api/notifications/[id]/read` | |
| POST | `/api/notifications/read-all` | |

## Hành vi giữ theo V1

- Mở chuông khi có chưa đọc = gọi read-all ngay (lần mở đó vẫn hiện chấm "chưa đọc").
- Bấm thông báo có công việc → đánh dấu đã đọc + mở `/tasks/{id}`.
- Tiêu đề/nội dung là chuỗi tiếng Việt lưu sẵn trong DB lúc tạo → không dịch được khi đổi ngôn ngữ (Phase B: lưu mã + tham số).
- Trang `/notifications` không có quyền menu riêng: ai đăng nhập cũng vào được (chỉ thấy của mình). Không thêm mục sidebar (preview không có).
- Phase B: lọc theo loại (API chưa có tham số), câu thông báo theo mẫu `nt.m.*` có tên người làm.

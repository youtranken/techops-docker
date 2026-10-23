# Module `dashboard` — Tổng quan (`/`)

V2 A3-1 (23/10/2026) dựng lại theo `docs/previews/ds-v2/dashboard.html`. **Nghiệp vụ V1 giữ nguyên**: API, query, cache, ai thấy số nào.

## Dữ liệu (không đổi so với V1)

| API | Service | Ghi chú |
|---|---|---|
| `GET /api/dashboard/stats` | `services/stats.service.ts` + `services/stats/*.query.ts` | Cache Redis **5 phút** theo người dùng (`dashboard:<userId>:<role>`), không bị xoá khi việc đổi. Client tự tải lại mỗi 2 phút. |
| `GET /api/dashboard/performance?days=7\|30` | `services/performance.service.ts` | Nhóm theo ngày UTC (`toISOString`). |
| `GET /api/settings/priorities` | (module settings) | Chỉ để biết `level` của mức ưu tiên (cờ Khẩn/Cao, màu thanh) — API tổng quan chỉ trả tên + màu. |

Phạm vi: Nhân viên = việc mình tạo hoặc được giao (`buildSecurityFilter`); Boss/Admin = tất cả. Ô Chờ duyệt / Chờ nghiệm thu / gia hạn và "Cần bạn xử lý" của Boss/Admin đếm **toàn hệ thống** (V1).

## Cấu trúc

```
view-model/dashboard-logic.ts   hàm thuần (có test __tests__/dashboard-logic.test.ts): chọn ô KPI theo vai trò,
                                ngưỡng SLA 80/60, phân bố tháng, trục biểu đồ, câu chào, thời gian tương đối
sections/DashboardSection.tsx   ghép trang: đang tải / lỗi / dữ liệu
components/DashboardHead.tsx    lời chào + "đang chờ bạn" (= tổng ô KPI 3 + 4)
components/KpiStrip.tsx         6 ô chỉ số
components/cards/ListCards.tsx  Cần bạn xử lý · Sắp đến hạn · Cập nhật gần đây
components/cards/CommentsCard.tsx, DistCards.tsx (Trạng thái, Ưu tiên + Quy trình), PerfCard.tsx (recharts)
components/parts/*              khung khối, dòng việc, cờ/mã/người làm
hooks/                          useDashboardStats, usePerformanceTrend (V1), usePriorityLevels
```

Lưới khối: lớp `.v2-db-*` trong `src/app/globals.css` (3 cột → 2 cột ≤1199 → 1 cột ≤680). Chữ: nhóm `db.*` trong `copy.js` (INCLUDE của `scripts/i18n/build-messages.mjs`).

Bấm việc → `TaskDetailDrawer` (module tasks) mở ở `app/(dashboard)/page.tsx`, ‹ › theo thứ tự trong khối; "Mở trang đầy đủ" → `/tasks/[id]`.

## Để Phase B (cần API mới)
- Danh sách từng đơn gia hạn chờ duyệt (V1 chỉ trả số → hiện badge "n gia hạn").
- Dòng "sự kiện cuối" ở Cập nhật gần đây (cần đọc nhật ký).
- "Xem tất cả" của Cần bạn xử lý → tab "Cần tôi xử lý" (tab chưa có, hiện về `/tasks`).
- Xoá cache tổng quan khi việc đổi trạng thái (V1 để số cũ tối đa 5 phút).

E2E: `e2e/dashboard-v2.spec.ts` (xoá khoá Redis `dashboard:ce2e*` trước khi mở trang).

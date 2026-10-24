# Module `analytics` — Báo cáo (`/analytics`, `/analytics/task-list`, `/analytics/research`)

V2 A3-5 (24/10/2026) dựng lại giao diện theo `docs/previews/ds-v2/reports.html` + `reports-tasks.html`. **Nghiệp vụ V1 giữ nguyên**: API, query, công thức, cache, quyền (`requireMenuAccess('analytics')` ở layout, `requireMenuPermission('analytics')` ở API).

## Dữ liệu (không đổi so với V1)

| Trang | API (V1) | Ghi chú |
|---|---|---|
| Tổng quan | `/api/analytics/kpi` (kỳ + kỳ trước), `/performance`, `/monthly-overview?year=`, `/task-types`, `/funnel`, `/drilldown?type=` | Cache Redis 5–15 phút (`analytics:*`). Kỳ trước = lùi đúng số ngày (`prevRange`). |
| Danh sách công việc | `/api/analytics/task-list`, `/task-list/employees`, `/task-list/export` | Mỗi dòng = 1 người được giao (chỉ vai trò Nhân viên). |
| Research | `/api/analytics/overdue`, `/workload` | V1 không có link tới trang; V2 giữ vậy (tab chỉ hiện khi đang mở trang). |
| Xuất | Excel: `/api/analytics/export`, `/task-list/export` · PDF: chụp vùng `#analytics-content` / `#task-list-content` bằng `html-to-image` + `jspdf` (`hooks/useExportPdf.ts`, V1) | Route PDF phía máy chủ (`/api/analytics/export/pdf`, cần Chrome) không dùng ở UI — backlog sau Phase B. |

## Cấu trúc

```
view/report-logic.ts          hàm thuần (test __tests__/report-logic.test.ts, oracle V1 __tests__/v1-report.fixture.ts):
                              ngày theo giờ VN, khoảng tháng/quý/năm, kỳ trước, đọc/ghi URL, URL API/xuất, ô KPI, % theo ngôn ngữ,
                              lọc quá hạn, tab theo vai trò
hooks/useAnalytics.ts         react-query V1 (giữ nguyên) · useDrillDown.ts · useExportPdf.ts (V1)
components/report/            OverviewPage · TaskListReport (+ TlTable) · ResearchReport · ReportHead (tiêu đề + tab con)
                              period.tsx (thanh chọn kỳ + nhãn kỳ) · KpiGrid · MonthlyCard (recharts) · PerfTable · SmallCards
                              (Phân bố / Phễu / Thời gian TB) · DrillDialog · parts.tsx (thẻ, vòng tròn, thanh ngang)
services/                     query V1 (không đổi)
```

Trang `app/(dashboard)/analytics/**/page.tsx` chỉ ghép section + `TaskDetailDrawer` (bấm việc → ngăn xem nhanh dùng chung với Công việc). Chữ: nhóm `rp.*` của `copy.js` + `rpx.*` ở `scripts/i18n/extra-messages.mjs`. Màu biểu đồ = token (`--primary`, `--c-done`, `--c-review`…), tự đổi sáng/tối.

## Lưu ý nghiệp vụ V1 (giữ nguyên, chưa sửa)
- KPI/Hiệu suất/Phễu/Loại/Danh sách: `dateTo` = 00:00 ngày cuối (`parseDate`) → việc tạo trong ngày cuối kỳ không được đếm; drill-down dùng cuối ngày → số trong danh sách có thể lớn hơn ô KPI.
- Drill-down "Hoàn thành" lọc theo ngày xong, ô KPI theo ngày tạo.
- "Đúng hạn" theo người = xong đúng hạn / tổng phần việc được giao (không phải / số đã xong).
- Quá hạn: KPI so với đầu ngày hôm nay; Hiệu suất / Danh sách / Research so với thời điểm hiện tại.
- Khối lượng (Research): "chờ" lọc nhầm `WAITING_ACK` (không có trạng thái này) → việc Chờ nhận không được đếm.
- Cột "Ngày tạo" ở Danh sách = ngày nhận việc (nếu có) hoặc ngày tạo (`receivedAt`).

## Để Phase B
- Kỳ "Năm" ở Tổng quan; lọc theo trạng thái ở Danh sách (API V1 không có); số việc chế độ Bắt buộc ở thẻ Phân bố (`force-mode.query` chưa có API trang).

E2E: `e2e/reports-v2.spec.ts` (xoá khoá Redis `analytics:*` trước khi đo).

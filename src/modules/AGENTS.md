# Modules — Hướng dẫn cho AI Agent

## Nguyên tắc tổ chức module

Mỗi thư mục trong `src/modules/` là một **module nghiệp vụ độc lập**.
Module không được import trực tiếp từ module khác (chỉ qua API).

## Cấu trúc bắt buộc của mỗi module

```
[ten-module]/
  types.ts          # ← VIẾT ĐẦU TIÊN. Tất cả interfaces/types của module
  index.ts          # Barrel export — chỉ export public API

  services/         # Server-side business logic
  hooks/            # Client-side React Query hooks
  components/       # UI components (phân theo domain/tính năng)
  sections/         # Page sections (kết hợp components + hooks)
  validators/       # Zod schemas (tùy chọn)
  mocks/            # Mock data (tùy chọn)
  config/           # Constants, config của module (tùy chọn)
```

## Giới hạn kích thước file (Best Practice)

| Loại | Tối đa | Hành động khi vượt |
|---|---|---|
| `types.ts` | **200 dòng** | Tách thành `types/base.ts`, `types/api.ts`, v.v. |
| `*.service.ts` | **250 dòng** | Tách theo responsibility (query, mutation, workflow) |
| `*.ts` hook | **120 dòng** | Tách queries và mutations riêng |
| `*.tsx` component | **150 dòng** | Tách sub-components |
| `*Section.tsx` | **250 dòng** | Tách nhỏ hơn hoặc dùng lazy load |
| `page.tsx` | **100 dòng** | Chỉ compose sections - giữ minimal |
| `route.ts` | **100 dòng** | Tách handler function ra file riêng |

**Nguyên tắc:** Vượt giới hạn = tín hiệu cần tách, không phải lỗi nghiêm trọng.
## Danh sách modules

| Module | Mô tả | AGENTS.md |
|---|---|---|
| `tasks/` | Quản lý công việc, workflow phê duyệt | [xem](tasks/AGENTS.md) |
| `helpdesk/` | Đồng bộ Helpdesk API, quản lý ticket | [xem](helpdesk/AGENTS.md) |
| `hr/` | Quản lý nhân sự, user accounts | [xem](hr/AGENTS.md) |
| `analytics/` | Báo cáo, thống kê hoạt động | [xem](analytics/AGENTS.md) |
| `notifications/` | Thông báo, email alerts | [xem](notifications/AGENTS.md) |
| `settings/` | Cài đặt hệ thống, Hồ sơ cá nhân | [xem](settings/AGENTS.md) |
| `logs/` | Nhật ký hoạt động người dùng | — |
| `auth/` | Xác thực (NextAuth wrapper) + giao diện Đăng nhập / Đổi mật khẩu lần đầu / Đặt lại / Xác nhận email (`lib/auth-logic.ts`) | — |
| `dashboard/` | Tổng quan dashboard | [xem](dashboard/AGENTS.md) |

## Quy ước đặt tên

```
services/   → [domain].service.ts       (vd: task-query.service.ts)
hooks/      → use[Feature].ts           (vd: useTaskList.ts)
components/ → [Domain]/[Component].tsx  (vd: TaskCard/TaskCard.tsx)
sections/   → [Feature]Section.tsx      (vd: TaskListSection.tsx)
```

## Khi tạo module mới

Sử dụng skill `new-module` trong `.claude/skills/new-module/SKILL.md`
hoặc làm theo các bước trong `AGENTS.md` gốc.

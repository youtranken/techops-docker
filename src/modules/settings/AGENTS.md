# Settings Module — Hướng dẫn cho AI Agent

## Mục đích

Module cài đặt hệ thống gồm 6 tabs:
- **Mức ưu tiên** — quản lý Priority (màu sắc, cấp độ)
- **Loại công việc** — quản lý TaskType (icon picker Lucide, không có color picker)
- **Nhãn Tag** — quản lý Tag cho task
- **Profile/Avatar** — cài đặt cá nhân (avatar, tên hiển thị)
- **Thông báo** — email notification prefs, phân tab Boss/Employee
- **SMTP** — cấu hình email server (Admin only)

## Cấu trúc

```
settings/
  types.ts                         # Tất cả interfaces — VIẾT ĐÂY TRƯỚC
  index.ts                         # Barrel export — public API

  services/
    priority.service.ts            # CRUD Priority (Prisma)
    task-type.service.ts           # CRUD TaskType (Prisma)
    tag.service.ts                 # CRUD Tag (Prisma)
    profile.service.ts             # Read/update UserProfile (Prisma)
    notification-prefs.service.ts  # Read/update UserNotificationPrefs (Prisma)
    smtp.service.ts                # Read/upsert SmtpConfig (Prisma), test email

  hooks/
    usePriorities.ts               # TanStack Query — priorities
    useTaskTypes.ts                # TanStack Query — task types
    useTags.ts                     # TanStack Query — tags
    useProfile.ts                  # TanStack Query — user profile
    useNotificationPrefs.ts        # TanStack Query — notification prefs
    useSmtp.ts                     # TanStack Query — smtp config (Admin only)

  components/
    PrioritiesSection.tsx          # Inline edit table for priorities
    TaskTypesSection.tsx           # Card grid + Lucide icon picker
    TagsSection.tsx                # Tag CRUD with color picker
    profile/                       # A3-2 (V2): trang Hồ sơ của tôi — ProfilePage (khối Tài khoản/Ảnh/Cơ bản/Liên hệ/Múi giờ+ngôn ngữ/Mật khẩu,
                                   #   StickySaveBar), ChangePasswordDialog, PasswordInput. Thay AvatarSection/Profile*/ChangePasswordSection (đã xoá).
    SettingsHeader.tsx             # Đầu khu Cài đặt (V1) — ẩn ở /settings/profile
    NotificationSection.tsx        # Email toggle + role filter + type checklist
    NotificationTypeList.tsx       # Sub-component: checklist with select-all
    SmtpSection.tsx                # SMTP form orchestrator
    SmtpServerFields.tsx           # Sub-component: host, port, SSL toggle
    SmtpAuthFields.tsx             # Sub-component: user, password with show/hide
    SmtpSenderFields.tsx           # Sub-component: fromName, fromEmail
```

## Phân quyền

| Tab | Ai xem được |
|---|---|
| Mức ưu tiên | Admin (từ sidebar Settings) |
| Loại công việc | Admin |
| Nhãn Tag | Admin |
| Profile/Avatar | Tất cả user (mỗi người xem profile của mình) |
| Thông báo | Tất cả user (mỗi người xem prefs của mình) |
| SMTP | Admin only — ẩn hoàn toàn với role khác |

## Hồ sơ (A3-2, V2 Phase A)

- Luật thuần ở `lib/profile-form.ts` (test `lib/__tests__/profile-form.test.ts`) và `lib/password-rules.ts` (test đối chiếu `validatePassword` server).
- zod của PATCH `/api/settings/profile` nằm ở `validators/profile.schema.ts`, route và client dùng chung (không đổi luật).
- Lưu: 1 StickySaveBar cho mọi ô; gửi đúng 2 body V1 — cơ bản `{displayName, position, department, timezone, bio}` rồi liên hệ `{email, phone}` (chỉ phần có đổi).
- Ảnh/màu lưu ngay như V1. Ảnh: chỉ gọi `POST /api/upload/avatar` (route tự ghi `avatarUrl`); bỏ lệnh PATCH `avatarUrl` thừa của V1 (luôn bị server từ chối vì URL tương đối → V1 báo lỗi dù ảnh đã lưu).
- Ngôn ngữ: thuần client (cookie `NEXT_LOCALE`), áp dụng ngay. Đổi mật khẩu: chính sách từ `/api/auth/password-policy`, lỗi server `WRONG_PASSWORD`/`SAME_PASSWORD`/`PASSWORD_POLICY_VIOLATION` hiện dưới ô.
- Phase B: xác nhận email khi đổi, "Bỏ ảnh", ngày đổi mật khẩu gần nhất (API profile chưa trả), bắt bỏ khoảng trắng tên / kiểm định dạng số điện thoại.
- `/settings/security` (cấu hình bảo mật hệ thống, Admin) và `/settings/notifications` (prefs email) thuộc lát Cài đặt.

## Quan trọng

- `NOTIFICATION_TYPES` định nghĩa trong `types.ts` và re-export từ `hooks/useNotificationPrefs.ts`
- `SmtpConfig.password` luôn được mask khi trả về từ API (thay bằng `"••••••"`)
- Khi update SMTP, nếu `password` rỗng → giữ password cũ trong DB
- `TaskType.description` là `string | null` trong DB nhưng input chỉ nhận `string | undefined` — dùng `?? undefined` khi pass vào mutate
- Docker: sau khi thay đổi Prisma schema, cần `docker exec techops-app npx prisma generate && docker restart techops-app`

## API Routes

| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `/api/settings/priorities` | List + create |
| PUT/DELETE | `/api/settings/priorities/[id]` | Update + delete |
| GET/POST | `/api/settings/task-types` | List + create |
| PUT/DELETE | `/api/settings/task-types/[id]` | Update + delete |
| GET/POST | `/api/settings/tags` | List + create |
| PUT/DELETE | `/api/settings/tags/[id]` | Update + delete |
| GET/PUT | `/api/settings/profile` | Read + update own profile |
| GET/PUT | `/api/settings/notification-prefs` | Read + update own prefs |
| GET/PUT | `/api/settings/smtp` | Admin: read + upsert SMTP config |
| POST | `/api/settings/smtp/test` | Admin: send test email |
| POST | `/api/upload/avatar` | Upload avatar image |

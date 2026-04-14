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
    SettingsClient.tsx             # Layout: grouped sidebar nav + content panel
    PrioritiesSection.tsx          # Inline edit table for priorities
    TaskTypesSection.tsx           # Card grid + Lucide icon picker
    TagsSection.tsx                # Tag CRUD with color picker
    AvatarSection.tsx              # Avatar upload + color presets + display name
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

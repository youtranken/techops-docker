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
    useGeneralConfig.ts            # A3-7: GET/PUT /api/settings/general (V1 gọi fetch trực tiếp trong component)

  components/
    profile/                       # A3-2 (V2): trang Hồ sơ của tôi — ProfilePage (khối Tài khoản/Ảnh/Cơ bản/Liên hệ/Múi giờ+ngôn ngữ/Mật khẩu,
                                   #   StickySaveBar), ChangePasswordDialog, PasswordInput. Thay AvatarSection/Profile*/ChangePasswordSection (đã xoá).
    shell/                         # A3-7: SettingsShell (đầu trang "Cài đặt" + nav con / ô chọn mục, hỏi khi rời mục chưa lưu),
                                   #   parts (PanelHead, SettingsBlock tiêu đề trái/ô phải như Hồ sơ, Switch/SwitchRow, Note, NoAccess…),
                                   #   choices (CheckList, DayPicker, TimePicker, ScheduleSummary)
    catalog/                       # A3-7: Mức ưu tiên / Loại công việc / Mẫu hoàn thành — DataTable + hộp thoại ActionDialog
    config/                        # A3-7: Thông báo, Báo cáo định kỳ, Nhắc quá hạn, SMTP (+ tab Mẫu email), Bảo mật, Chung — 1 StickySaveBar/trang
  lib/
    catalog-forms.ts / config-forms.ts  # luật nhập = zod route V1, body = V1 (test đối chiếu __tests__/v1-settings.fixture.ts)
    schedule.ts                    # thứ/giờ gửi (giờ VN), T2–T6, "giữ ít nhất 1 mục"
    settings-nav.ts                # mục nav con theo vai trò + featurePermissions.settings (đúng V1)
```

## Cài đặt (A3-7, V2 Phase A)

- `layout.tsx` (server) vẫn `requireSettingsFeature()` như V1, tính danh sách mục bằng `settingsSections` rồi bọc `SettingsShell`.
  Các guard từng trang giữ nguyên V1 (`/settings/smtp` layout chỉ Admin, `/settings/overdue-reminder` chỉ Admin/Boss; `/settings/security`,
  `/settings/general`, `/settings/digest` không chặn ở trang → API 403 → hiện "Bạn không có quyền xem mục này" thay vì quay mãi).
- "Chung" (`/settings/general`) KHÔNG đưa vào nav (V1 không có trong menu), trang vẫn mở bằng URL, gắn "Chờ quyết định".
- "Mẫu email" là tab `?tab=templates` của `/settings/smtp` (V1 là tab trong trang SMTP).
- Lệnh ghi giữ V1. Sửa lỗi V1: tạo mẫu hoàn thành không danh mục (V1 gửi `category:null` → 400), sửa loại công việc xoá trống mô tả
  (V1 bỏ trường → không xoá được). Bảo mật "Đặt lại mặc định" vẫn ghi ngay như V1, nay hỏi xác nhận trước.
- Phase B: "Khôi phục mẫu email mặc định" (không có API), "Cho phép nhiều thiết bị" (V1 lưu nhưng chưa áp dụng — vẫn cho đổi, gắn nhãn).

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
| GET/PATCH | `/api/settings/notification-prefs` | Boss/Admin: cấu hình chung (PATCH); nhân viên: chỉ xem của mình |
| GET/PUT | `/api/settings/smtp` | Admin: read + upsert SMTP config |
| POST | `/api/settings/smtp/test` | Admin: send test email |
| POST | `/api/upload/avatar` | Upload avatar image |

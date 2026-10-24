# Module: HR — Hướng dẫn cho AI Agent

## Mục đích

Quản lý tài khoản người dùng và phân quyền sidebar trong hệ thống.

## Cấu trúc hiện tại

```
hr/
  users/
    types.ts                    # Interfaces: UserWithRole, UserWithRoleAndTasks, ListUsersFilters, ...
    index.ts                    # Barrel export

    services/
      user.service.ts           # Façade — re-export query + mutation services
      user-query.service.ts     # list(), listForEmployee(), getById()
      user-mutation.service.ts  # create(), update(), deactivate(), deleteHard(), resetPassword(),
                                #   bulkDeactivate(), bulkActivate()
      role.service.ts           # getRoles()

    hooks/
      useUsers.ts               # Danh sách users (paginated, filter, date range)
      useCreateUser.ts          # Tạo user mới
      useUpdateUser.ts          # Cập nhật user
      useDeactivateUser.ts      # Vô hiệu hóa
      useActivateUser.ts        # Kích hoạt lại
      useDeleteUser.ts          # Xóa cứng
      useResetPassword.ts       # Đặt lại mật khẩu
      useBulkAction.ts          # Bulk deactivate/activate
      useRoles.ts               # Danh sách roles
      useUserHistory.ts         # Lịch sử hoạt động per-user

    view/                       # Logic thuần V2 (A3-4), có test đối chiếu V1 (__tests__/v1-people.fixture.ts)
      people-logic.ts           # quyền từng dòng (menu ⋯), chọn hàng loạt, bộ lọc → query/CSV
      people-forms.ts           # luật nhập + body POST/PATCH của Tạo / Sửa / Đặt lại mật khẩu

    components/People/          # Trang Nhân sự V2 (preview people.html)
      PeoplePage.tsx            # ghép trang; usePeoplePage (bộ lọc, dữ liệu, chọn) + usePeopleActions (xác nhận, mutation)
      PeopleFilters.tsx · PeopleBulkBar.tsx · PeopleTable.tsx (DataTable + QuickMenu)
      UserDrawer.tsx + UserHistoryList.tsx   # ngăn chi tiết + lịch sử (thay UserHistoryModal)
      CreateUserDialog.tsx · EditUserDialog.tsx · ResetPasswordDialog.tsx · PasswordChecklist.tsx

  permissions/
    types.ts                    # UserPermRow, SavePermissionInput
    config.ts                   # MENU_CONFIG (logs, analytics, helpdesk, hr, settings)
    index.ts                    # Barrel export

    services/
      sidebar-permission.service.ts   # listAll(), getForUser(), save()

    hooks/
      useSidebarPermissions.ts  # Query + mutation sidebar permissions

    view/perm-logic.ts          # bật/tắt menu/tính năng = đúng phép biến đổi V1; đếm thay đổi; body PUT

    components/PermissionsPage/ # Trang Phân quyền V2 (preview permissions.html, phần "Theo người dùng")
      PermissionsPage.tsx       # danh sách nhân viên + khối menu + thanh Lưu; trang con /hr/permissions/{logs,users,…} = lọc menu
      PermMenuBlock.tsx · PermUserList.tsx · usePermEditor.ts (bản nháp, 1 PUT khi Lưu)

  shared/HrPageHead.tsx         # đầu trang + tab Người dùng · Phân quyền; nhãn vai trò ppx.role.* (= ROLE_LABELS V1)

  # Re-export wrappers (backward compat)
  hooks/          → re-export từ users/hooks/
  services/       → re-export từ users/services/
```

## API Routes

| Route | Method | Mô tả | Auth |
|---|---|---|---|
| `/api/hr/users` | GET | Danh sách users (filter, search, date range, pagination) | Auth (EMPLOYEE chỉ thấy EMPLOYEE) |
| `/api/hr/users` | POST | Tạo user mới | ADMIN only |
| `/api/hr/users/[id]` | GET | Lấy user theo ID | ADMIN/BOSS |
| `/api/hr/users/[id]` | PATCH | Cập nhật user | Auth (EMPLOYEE chỉ sửa mình) |
| `/api/hr/users/[id]` | DELETE | Xóa cứng user | ADMIN only |
| `/api/hr/users/bulk-action` | POST | Bulk deactivate/activate | ADMIN/BOSS |
| `/api/hr/users/export` | GET | Xuất CSV | ADMIN/BOSS |
| `/api/hr/roles` | GET | Danh sách roles | Auth |
| `/api/hr/sidebar-permissions` | GET | Permissions per-user hoặc all (có pagination) | Auth |
| `/api/hr/sidebar-permissions` | PUT | Lưu permissions | ADMIN/BOSS |

## Quy tắc quan trọng

- **EMPLOYEE không thấy ADMIN/BOSS** trong danh sách (server-side filter `listForEmployee`)
- **EMPLOYEE không đổi password của ADMIN/BOSS** dù có feature permission
- **EMPLOYEE không thay đổi roleId, isActive** của bất kỳ ai
- **Bulk actions** chỉ dành cho ADMIN/BOSS, xày qua `prisma.$transaction`
- **Export CSV** chỉ dành cho ADMIN/BOSS
- **Avatar** lấy từ `UserProfile.avatarUrl` — do Settings/Profile module quản lý, HR chỉ đọc
- Password hash bằng `bcryptjs`, không bao giờ lưu plaintext
- `isActive = false` để vô hiệu hóa, không xóa cứng user có lịch sử task

## Prisma schema liên quan

- `User` → có `profile UserProfile?` (avatarUrl, avatarColor)
- `UserActivityLog` — actions: CREATE_USER, UPDATE_USER, DELETE_USER, RESET_PASSWORD,
  DEACTIVATE_USER, ACTIVATE_USER (enum `UserAction`)
- `SidebarPermission` — JSON fields: visibleMenus, featurePermissions

## V2 (A3-4) — ghi chú

- Phân quyền V2 gom các lần bật/tắt và gửi 1 PUT khi bấm Lưu (V1 lưu ngay mỗi lần bấm); body giữ dạng V1.
- `/hr/users/[id]/permissions` vẫn 404 như V1; override quyền công việc (rbac) chưa có hiệu lực → Phase B.
- Nhân viên không còn thấy mục "Lịch sử hoạt động" của người khác (API `/api/logs/users` chỉ trả lịch sử của chính họ).

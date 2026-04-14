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

    components/
      UserTable.tsx             # Bảng users (avatar thật từ profile, checkbox bulk, actions menu)
      UserActionsMenu.tsx       # Dropdown: sửa, đổi pw, lịch sử, vô hiệu, xóa
      ChangePasswordModal.tsx   # Modal đổi mật khẩu + password strength indicator
      EditUserModal.tsx         # Modal sửa thông tin user
      CreateUserModal.tsx       # Modal tạo user mới
      UserFormFields.tsx        # Form fields dùng chung (displayName, email, role)
      UserPasswordFields.tsx    # Password fields dùng chung
      DeleteUserDialog.tsx      # Confirm xóa
      UserHistoryModal.tsx      # Modal lịch sử hoạt động per-user

  permissions/
    types.ts                    # UserPermRow, SavePermissionInput
    config.ts                   # MENU_CONFIG (logs, analytics, helpdesk, hr, settings)
    index.ts                    # Barrel export

    services/
      sidebar-permission.service.ts   # listAll(), getForUser(), save()

    hooks/
      useSidebarPermissions.ts  # Query + mutation sidebar permissions

    components/
      PermissionsTable.tsx      # Bảng phân quyền per-user

    sections/
      PermissionsMatrixSection.tsx    # Section tổng hợp

  # Re-export wrappers (backward compat)
  components/     → re-export từ users/components/
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

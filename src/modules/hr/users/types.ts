import type { User, Role } from '@prisma/client';

/** User trả ra API — KHÔNG kèm mã băm `password` */
export type UserWithRole = Omit<User, 'password'> & { role: Role; profile?: { avatarUrl: string | null; avatarColor: string } | null };
export type UserWithRoleAndTasks = UserWithRole & { hasTasks: boolean };

/** Bỏ mã băm mật khẩu trước khi trả bản ghi User ra ngoài service */
export function withoutPassword<T extends object>(user: T): Omit<T, 'password'> {
  const { password: _password, ...rest } = user as T & { password?: unknown };
  return rest;
}

export interface ListUsersFilters {
  search?: string;
  roleId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  createdFrom?: string; // ISO date string
  createdTo?: string;   // ISO date string
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  email?: string;
  password: string;
  roleId: string;
  mustChangePassword?: boolean;
}

export interface UpdateUserInput {
  displayName?: string;
  email?: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
}

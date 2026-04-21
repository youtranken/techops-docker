import type { User, Role } from '@prisma/client';

export type UserWithRole = User & { role: Role; profile?: { avatarUrl: string | null; avatarColor: string } | null };
export type UserWithRoleAndTasks = UserWithRole & { hasTasks: boolean };

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

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useUserActivityLogs } from '../hooks/useUserActivityLogs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: '🔐 Đăng nhập',
  LOGOUT: '🔓 Đăng xuất',
  VIEW_PAGE: '👁️ Xem trang',
  EXPORT_DATA: '📤 Xuất dữ liệu',
  CREATE_USER: '👤 Tạo người dùng',
  UPDATE_USER: '✏️ Cập nhật người dùng',
  DELETE_USER: '🗑️ Xoá người dùng',
  RESET_PASSWORD: '🔑 Đặt lại mật khẩu',
  CHANGE_SETTINGS: '⚙️ Đổi cài đặt',
};

const USER_ACTIONS = Object.keys(ACTION_LABELS);

export function UserActivityLogTable() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUserActivityLogs({
    action: action || undefined,
    page,
    limit: 20,
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <Select value={action} onValueChange={(v) => { setAction(v === 'ALL' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Hành động..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            {USER_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Thời gian</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Người dùng</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Hành động</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">IP</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">Đang tải...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">Không có dữ liệu</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {log.user.displayName}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">@{log.user.username}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {log.ipAddress ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                    {log.userAgent ? log.userAgent.slice(0, 40) + '...' : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {pagination.total} kết quả · Trang {pagination.page}/{pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

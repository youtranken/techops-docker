'use client';

import { useState, useEffect } from 'react';
import type { HelpdeskPendingItem } from '@/modules/helpdesk/types';

interface AssignableUser {
  id:          string;
  displayName: string;
}

interface AssignHelpdeskModalProps {
  item:         HelpdeskPendingItem | null;
  open:         boolean;
  onClose:      () => void;
  onConfirm:    (id: string, assigneeId: string) => void;
  isSubmitting: boolean;
}

export function AssignHelpdeskModal({
  item,
  open,
  onClose,
  onConfirm,
  isSubmitting,
}: AssignHelpdeskModalProps) {
  const [users, setUsers]               = useState<AssignableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedUserId('');
    setLoadingUsers(true);
    fetch('/api/tasks/assignable-users')
      .then((r) => r.json())
      .then((res: { data?: AssignableUser[] }) => {
        if (Array.isArray(res.data)) setUsers(res.data);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [open]);

  if (!open || !item) return null;

  function handleSubmit() {
    if (!selectedUserId || !item) return;
    onConfirm(item.id, selectedUserId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gán IT Support</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Ticket info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 shrink-0 w-24">ID:</span>
            <span className="font-mono text-gray-700 dark:text-gray-200">{item.hdId}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 shrink-0 w-24">Tiêu đề:</span>
            <span className="text-gray-800 dark:text-gray-100 font-medium">{item.tieuDe}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 shrink-0 w-24">Nhân viên:</span>
            <span className="text-gray-700 dark:text-gray-300">{item.nhanVien}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 shrink-0 w-24">Phòng ban:</span>
            <span className="text-gray-700 dark:text-gray-300">{item.phongBan}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400 shrink-0 w-24">Ưu tiên:</span>
            <span className="text-gray-700 dark:text-gray-300">{item.uuTien}</span>
          </div>
        </div>

        {/* Select assignee */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Người xử lý (IT Support)
          </label>
          {loadingUsers ? (
            <p className="text-sm text-gray-400 animate-pulse">Đang tải danh sách...</p>
          ) : (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn người xử lý --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedUserId || isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors"
          >
            {isSubmitting ? 'Đang gán...' : 'Xác nhận gán'}
          </button>
        </div>
      </div>
    </div>
  );
}

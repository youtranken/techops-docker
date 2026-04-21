import type { MenuConfig } from './types';

export const MENU_CONFIG: MenuConfig[] = [
  {
    key: 'logs',
    label: 'Logs',
    features: [
      { key: 'task_activity', label: 'Task Activity' },
      { key: 'user_activity', label: 'User Activity' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    features: [],
  },
  {
    key: 'helpdesk',
    label: 'Helpdesk',
    features: [],
  },
  {
    key: 'hr',
    label: 'Nhân viên (HR)',
    features: [
      { key: 'edit', label: 'Chỉnh sửa' },
      { key: 'change_password', label: 'Đổi mật khẩu' },
      { key: 'deactivate', label: 'Vô hiệu hóa' },
      { key: 'delete', label: 'Xóa' },
    ],
  },
  {
    key: 'settings',
    label: 'Cài đặt hệ thống',
    features: [
      { key: 'priorities', label: 'Mức ưu tiên' },
      { key: 'task_types', label: 'Loại công việc' },
      { key: 'completion_templates', label: 'Mẫu hoàn thành' },
      { key: 'profile', label: 'Profile' },
      { key: 'notifications', label: 'Thông báo' },
      // NOTE: SMTP config chỉ dành cho ADMIN - không thêm vào permissions vì rất nguy hiểm
    ],
  },
];

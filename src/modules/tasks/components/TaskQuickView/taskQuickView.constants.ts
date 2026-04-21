export const ASSIGNEE_STATUS_LABEL: Record<string, string> = {
  PENDING:             'Chờ tiếp nhận',
  WAITING_ACKNOWLEDGE: 'Chờ tiếp nhận',
  IN_PROGRESS:         'Đang thực hiện',
  COMPLETED:           'Hoàn thành',
  REJECTED:            'Từ chối',
  CANCELLED:           'Đã hủy',
  PENDING_APPROVAL:    'Chờ duyệt',
  PENDING_REVIEW:      'Chờ review',
  REVISION_REQUIRED:   'Cần chỉnh sửa',
};

export const ASSIGNEE_STATUS_COLOR: Record<string, string> = {
  COMPLETED:           'text-emerald-600',
  REJECTED:            'text-red-500',
  CANCELLED:           'text-red-400',
  IN_PROGRESS:         'text-amber-600',
  REVISION_REQUIRED:   'text-amber-500',
  PENDING_APPROVAL:    'text-purple-600',
  PENDING_REVIEW:      'text-violet-600',
  PENDING:             'text-slate-900',
  WAITING_ACKNOWLEDGE: 'text-slate-900',
};

export const ACTION_LABELS: Record<string, string> = {
  TASK_CREATED:        'Tạo công việc',
  TASK_UPDATED:        'Cập nhật công việc',
  TASK_CANCELLED:      'Hủy công việc',
  TASK_DELETED:        'Xóa công việc',
  PLAN_APPROVED:       'Duyệt công việc',
  PLAN_REJECTED:       'Từ chối công việc',
  ACKNOWLEDGED:        'Tiếp nhận',
  REJECTED:            'Từ chối',
  TRANSFERRED:         'Chuyển giao',
  COMPLETED:           'Hoàn thành',
  REVIEW_APPROVED:     'Duyệt KQ hoàn thành',
  REVIEW_REJECTED:     'Từ chối kết quả',
  REASSIGNED:          'Giao lại',
  EXTENSION_REQUESTED: 'Xin gia hạn',
  STATUS_CHANGED:      'Đổi trạng thái',
};

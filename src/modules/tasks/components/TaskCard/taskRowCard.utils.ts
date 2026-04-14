export function getAssigneeStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':         return '#10b981';
    case 'REJECTED':
    case 'CANCELLED':         return '#ef4444';
    case 'IN_PROGRESS':
    case 'DOING':
    case 'REVISION_REQUIRED': return '#f59e0b';
    case 'PENDING_APPROVAL':
    case 'PENDING_REVIEW':    return '#a855f7';
    case 'WAITING_ACKNOWLEDGE':
    case 'PENDING':           return '#000000';
    default:                  return '#cbd5e1';
  }
}

export function getAssigneeStatusLabel(status: string): string {
  switch (status?.toUpperCase()) {
    case 'PENDING':              return 'Chờ tiếp nhận';
    case 'WAITING_ACKNOWLEDGE':  return 'Chờ tiếp nhận';
    case 'IN_PROGRESS':
    case 'DOING':                return 'Đang thực hiện';
    case 'COMPLETED':            return 'Hoàn thành';
    case 'REJECTED':             return 'Đã từ chối';
    case 'CANCELLED':            return 'Đã hủy';
    case 'PENDING_APPROVAL':     return 'Chờ duyệt';
    case 'PENDING_REVIEW':       return 'Chờ review';
    case 'REVISION_REQUIRED':    return 'Cần chỉnh sửa';
    default:                     return status || 'Không rõ';
  }
}

export function getDeadlineInfo(scheduleEnd: Date | string, status: string) {
  const isDone = ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status);
  const now      = new Date();
  const deadline = new Date(scheduleEnd);
  const diffMs   = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isPastDue = diffMs < 0;

  if (isDone)        return { color: 'text-slate-400',   isPastDue, isDone, deadline };
  if (isPastDue)     return { color: 'text-red-500',     isPastDue, isDone, deadline };
  if (diffDays <= 3) return { color: 'text-emerald-600', isPastDue, isDone, deadline };
  if (diffDays <= 7) return { color: 'text-amber-500',   isPastDue, isDone, deadline };
  return                    { color: 'text-slate-400',   isPastDue, isDone, deadline };
}

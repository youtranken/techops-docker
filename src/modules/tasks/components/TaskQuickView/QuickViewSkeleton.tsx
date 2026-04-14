'use client';

import { Loader2 } from 'lucide-react';

export function QuickViewLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        <p className="text-sm">Đang tải...</p>
      </div>
    </div>
  );
}

export function QuickViewError() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-slate-600">Không tìm thấy công việc</p>
        <p className="text-xs text-slate-400">Công việc có thể đã bị xóa hoặc bạn không có quyền xem</p>
      </div>
    </div>
  );
}

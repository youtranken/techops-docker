'use client';

import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import type { TaskListRow } from '../services/analytics.service';

interface TaskListTableProps {
  rows: TaskListRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  showEmployee?: boolean;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:           { label: 'Chờ tiếp nhận',   cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  ACKNOWLEDGED:      { label: 'Đã tiếp nhận',     cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  IN_PROGRESS:       { label: 'Đang thực hiện',   cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  COMPLETED:         { label: 'Hoàn thành',        cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  REJECTED:          { label: 'Từ chối',            cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  TRANSFERRED:       { label: 'Chuyển giao',       cls: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  REVISION_REQUIRED: { label: 'Cần sửa lại',      cls: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
};

function OnTimeBadge({ isOnTime, isOverdue }: { isOnTime: boolean | null; isOverdue: boolean }) {
  if (isOverdue) return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Quá hạn</span>;
  if (isOnTime === true)  return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Đúng hạn</span>;
  if (isOnTime === false) return <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">Trễ hạn</span>;
  return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
}

const PAGE_SIZES = [10, 20, 50, 100];
const fmt = (iso: string) => dayjs(iso).format('DD/MM/YYYY');

export function TaskListTable({ rows, total, page, pageSize, onPageChange, onPageSizeChange, showEmployee = true }: TaskListTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (rows.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">Không có dữ liệu trong khoảng thời gian này</div>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider rounded-l-lg w-8">#</th>
              {showEmployee && <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">Nhân viên</th>}
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Tên task</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Loại</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ngày tạo</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ngày Hoàn thành</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Số ngày</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Đúng/Trễ</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider rounded-r-lg">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row, idx) => {
              const statusInfo = STATUS_MAP[row.status] ?? { label: row.status, cls: 'bg-gray-100 text-gray-600' };
              const rowNum = (page - 1) * pageSize + idx + 1;
              return (
                <tr key={row.assigneeId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-3 py-3 text-xs text-gray-400 tabular-nums">{rowNum}</td>
                  {showEmployee && (
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-[13px]">{row.displayName}</span>
                    </td>
                  )}
                  <td className="px-3 py-3 max-w-[240px]">
                    <p className="font-medium text-gray-900 dark:text-white text-[13px] leading-tight line-clamp-2">{row.taskTitle}</p>
                    {row.taskCode && <p className="text-[10px] text-gray-400 mt-0.5">{row.taskCode}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[12px] text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.taskType}</span>
                  </td>
                  <td className="px-3 py-3 text-center text-[12px] text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmt(row.receivedAt)}</td>
                  <td className={cn('px-3 py-3 text-center text-[12px] whitespace-nowrap font-medium', row.isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400')}>
                    {fmt(row.scheduleEnd)}
                  </td>
                  <td className="px-3 py-3 text-center text-[12px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {row.completedAt ? fmt(row.completedAt) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {row.processingDays !== null
                      ? <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{row.processingDays}d</span>
                      : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <OnTimeBadge isOnTime={row.isOnTime} isOverdue={row.isOverdue} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn('inline-flex px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap', statusInfo.cls)}>
                      {statusInfo.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Hiển thị {from}–{to} / {total.toLocaleString('vi-VN')} task</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none cursor-pointer"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / trang</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-2.5 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ‹
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  'w-8 h-8 text-sm rounded border transition-colors',
                  p === page
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
                )}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-2.5 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

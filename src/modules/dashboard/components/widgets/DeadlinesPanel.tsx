'use client';

import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';


interface AssigneeSnippet {
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
}

interface DeadlineItem {
  id: string;
  taskCode: string | null;
  title: string;
  status: string;
  scheduleEnd: Date | string;
  priority: { name: string; color: string } | null;
  assignees: AssigneeSnippet[];
}

interface DeadlinesPanelProps {
  items: DeadlineItem[];
}

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS:         'Đang làm',
  WAITING_ACKNOWLEDGE: 'Chờ tiếp nhận',
  PENDING_APPROVAL:    'Chờ duyệt',
  PENDING_REVIEW:      'Chờ Review',
};

function DeadlineInfo({ date }: { date: Date | string }) {
  const end = new Date(date);
  const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
  const d = String(end.getDate()).padStart(2, '0');
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const y = end.getFullYear();
  const full = `${d}/${m}/${y}`;
  if (diff < 0) return (
    <div className="text-right shrink-0">
      <div className="text-[11px] font-semibold text-red-500">Quá {Math.abs(diff)} ngày</div>
      <div className="text-[10px] text-red-400">{full}</div>
    </div>
  );
  if (diff === 0) return (
    <div className="text-right shrink-0">
      <div className="text-[11px] font-semibold text-amber-500">Hôm nay</div>
      <div className="text-[10px] text-amber-400">{full}</div>
    </div>
  );
  return (
    <div className="text-right shrink-0">
      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">còn {diff} ngày</div>
      <div className="text-[10px] text-gray-300 dark:text-gray-600">{full}</div>
    </div>
  );
}

function MiniAvatar({ a }: { a: AssigneeSnippet }) {
  return a.avatarUrl ? (
    <img src={a.avatarUrl} alt={a.displayName}
      className="w-5 h-5 rounded-full object-cover ring-1 ring-white dark:ring-gray-900" />
  ) : (
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-white dark:ring-gray-900"
      style={{ backgroundColor: a.avatarColor }}>
      {a.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

export function DeadlinesPanel({ items }: DeadlinesPanelProps) {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sắp hết hạn</h2>
          {items.length > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 tabular-nums">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">trong 7 ngày tới</span>
          <button onClick={() => router.push('/tasks')}
            className="text-[11px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ml-1">
            Xem tất cả
          </button>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          Không có task nào sắp hết hạn
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(`/tasks/${item.id}`)}
              className="w-full text-left flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-l-2 hover:border-indigo-400 transition-all group"
            >
              {/* Priority bar */}
              <div className="w-1 h-8 rounded-full shrink-0"
                style={{ backgroundColor: item.priority?.color ?? '#d1d5db' }} />

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {item.taskCode && (
                    <span className="font-mono text-[10px] text-gray-400 shrink-0">{item.taskCode}</span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium leading-snug">
                  {item.title}
                </p>
                {item.assignees.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex -space-x-1">
                      {item.assignees.slice(0, 3).map((a, i) => <MiniAvatar key={i} a={a} />)}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {item.assignees[0].displayName}
                      {item.assignees.length > 1 ? ` +${item.assignees.length - 1}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Deadline info */}
              <DeadlineInfo date={item.scheduleEnd} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

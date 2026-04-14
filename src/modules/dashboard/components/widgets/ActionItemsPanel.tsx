'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, CheckSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskItem {
  id: string;
  taskCode: string | null;
  title: string;
  status: string;
  scheduleEnd: Date | string;
  priority: { name: string; color: string } | null;
}

interface ActionItemsPanelProps {
  items: TaskItem[];
  pendingExtensions: number;
  isBoss: boolean;
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; pill: string; dot: string }> = {
  PENDING_APPROVAL:    { label: 'Chờ duyệt',      icon: AlertCircle, pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', dot: 'bg-violet-500' },
  PENDING_REVIEW:      { label: 'Chờ Review',     icon: CheckSquare, pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', dot: 'bg-violet-500' },
  WAITING_ACKNOWLEDGE: { label: 'Chờ tiếp nhận',  icon: Clock,       pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',   dot: 'bg-amber-400' },
  IN_PROGRESS:         { label: 'Đang làm',         icon: Clock,       pill: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',       dot: 'bg-blue-500' },
};

function DeadlineInfo({ date }: { date: Date | string }) {
  const end = new Date(date);
  const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
  const d = String(end.getDate()).padStart(2, '0');
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const y = end.getFullYear();
  const full = `${d}/${m}/${y}`;
  if (diff < 0) {
    return (
      <div className="text-right shrink-0">
        <div className="text-[11px] font-semibold text-red-500">Quá {Math.abs(diff)} ngày</div>
        <div className="text-[10px] text-red-400">{full}</div>
      </div>
    );
  }
  if (diff === 0) {
    return (
      <div className="text-right shrink-0">
        <div className="text-[11px] font-semibold text-amber-500">Hôm nay</div>
        <div className="text-[10px] text-amber-400">{full}</div>
      </div>
    );
  }
  return (
    <div className="text-right shrink-0">
      <div className="text-[11px] text-gray-400">còn {diff} ngày</div>
      <div className="text-[10px] text-gray-300 dark:text-gray-600">{full}</div>
    </div>
  );
}

export function ActionItemsPanel({ items, pendingExtensions, isBoss }: ActionItemsPanelProps) {
  const router = useRouter();
  const title = isBoss ? 'Cần duyệt' : 'Cần xử lý';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-violet-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {items.length > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 tabular-nums">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isBoss && pendingExtensions > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {pendingExtensions} gia hạn
            </span>
          )}
          <button onClick={() => router.push('/tasks')}
            className="text-[11px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Xem tất cả
          </button>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          {isBoss ? 'Không có task nào cần duyệt' : 'Không có task nào cần xử lý'}
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {items.map((item) => {
            const meta = STATUS_META[item.status];
            const Icon = meta?.icon ?? Clock;
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/tasks/${item.id}`)}
                className="w-full text-left flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-l-2 hover:border-indigo-400 transition-all group"
              >
                {/* Status dot */}
                <div className={cn('w-2 h-2 rounded-full shrink-0', meta?.dot ?? 'bg-gray-400')} />

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {item.taskCode && (
                      <span className="font-mono text-[10px] text-gray-400 shrink-0">{item.taskCode}</span>
                    )}
                    {item.priority && (
                      <span className="text-[10px] font-semibold px-1.5 py-px rounded-full shrink-0"
                        style={{ background: item.priority.color + '20', color: item.priority.color }}>
                        {item.priority.name}
                      </span>
                    )}
                    {meta && (
                      <span className={cn('text-[10px] font-medium px-1.5 py-px rounded-full shrink-0 hidden sm:inline-flex items-center gap-1', meta.pill)}>
                        <Icon className="w-2.5 h-2.5" />
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium leading-snug">
                    {item.title}
                  </p>
                </div>

                {/* Deadline */}
                <DeadlineInfo date={item.scheduleEnd} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarDays, ArrowRight } from 'lucide-react';

interface AssigneeSnippet {
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
}

interface RecentTask {
  id: string;
  taskCode: string | null;
  title: string;
  status: string;
  scheduleEnd: Date | string;
  updatedAt: Date | string;
  priority: { name: string; color: string } | null;
  assignees: AssigneeSnippet[];
  creator: { displayName: string; avatarColor: string; avatarUrl: string | null } | null;
}

interface RecentActivitiesProps {
  tasks: RecentTask[];
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:               'Nháp',
  PENDING_APPROVAL:    'Chờ duyệt',
  WAITING_ACKNOWLEDGE: 'Chờ tiếp nhận',
  IN_PROGRESS:         'Đang làm',
  PENDING_REVIEW:      'Chờ Review',
  COMPLETED:           'Hoàn thành',
  CANCELLED:           'Đã huỷ',
};

const STATUS_DOT: Record<string, string> = {
  DRAFT:               'bg-gray-400',
  PENDING_APPROVAL:    'bg-violet-500',
  WAITING_ACKNOWLEDGE: 'bg-amber-400',
  IN_PROGRESS:         'bg-amber-500',
  PENDING_REVIEW:      'bg-violet-400',
  COMPLETED:           'bg-emerald-500',
  CANCELLED:           'bg-red-400',
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT:               'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  PENDING_APPROVAL:    'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  WAITING_ACKNOWLEDGE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  IN_PROGRESS:         'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  PENDING_REVIEW:      'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  COMPLETED:           'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  CANCELLED:           'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
};

function DeadlineBadge({ date, status }: { date: Date | string; status: string }) {
  const end = new Date(date);
  const dd = String(end.getDate()).padStart(2, '0');
  const mm = String(end.getMonth() + 1).padStart(2, '0');
  const yyyy = end.getFullYear();
  const label = `${dd}/${mm}/${yyyy}`;

  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs tabular-nums text-gray-400 dark:text-gray-500">
        <CalendarDays className="w-3 h-3" />
        {label}
      </span>
    );
  }

  const diffDays = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  const colorCls =
    diffDays < 0   ? 'text-red-500 dark:text-red-400' :
    diffDays === 0 ? 'text-amber-500 dark:text-amber-400' :
    diffDays <= 3  ? 'text-orange-500 dark:text-orange-400' :
                     'text-gray-500 dark:text-gray-400';
  const badge =
    diffDays < 0   ? `Quá ${Math.abs(diffDays)}n` :
    diffDays === 0 ? 'Hôm nay' :
    diffDays <= 3  ? `Còn ${diffDays}n` : null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs tabular-nums font-medium whitespace-nowrap', colorCls)}>
      <CalendarDays className="w-3 h-3 shrink-0" />
      {label}
      {badge && (
        <span className="font-bold text-[10px] px-1 py-0.5 rounded bg-current/10">{badge}</span>
      )}
    </span>
  );
}

function AssigneeAvatars({ assignees }: { assignees: AssigneeSnippet[] }) {
  if (assignees.length === 0) return <span className="text-gray-400 text-xs">—</span>;
  const shown = assignees.slice(0, 3);
  const extra = assignees.length - shown.length;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {shown.map((a, i) =>
          a.avatarUrl ? (
            <img key={i} src={a.avatarUrl} alt={a.displayName}
              className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 object-cover" />
          ) : (
            <div key={i}
              className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[9px] font-bold"
              style={{ backgroundColor: a.avatarColor }}>
              {a.displayName.charAt(0).toUpperCase()}
            </div>
          )
        )}
        {extra > 0 && (
          <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
            +{extra}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[72px] hidden sm:block">
        {shown[0].displayName}{extra > 0 ? ` +${extra}` : ''}
      </span>
    </div>
  );
}

function CreatorCell({ creator }: { creator: RecentTask['creator'] }) {
  if (!creator) return <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {creator.avatarUrl ? (
        <img src={creator.avatarUrl} alt={creator.displayName}
          className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 object-cover" />
      ) : (
        <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[9px] font-bold shrink-0"
          style={{ backgroundColor: creator.avatarColor }}>
          {creator.displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[80px] hidden lg:block">
        {creator.displayName}
      </span>
    </div>
  );
}

const COLS = ['Nhiệm vụ', 'Ưu tiên', 'Trạng thái', 'Người tạo', 'Phụ trách', 'Deadline'];

export function RecentActivities({ tasks }: RecentActivitiesProps) {
  const router = useRouter();

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
        <span className="text-sm">Chưa có nhiệm vụ nào</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {COLS.map((h) => (
              <th key={h}
                className="px-4 py-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap bg-gray-50/80 dark:bg-gray-800/40 first:rounded-tl-lg last:rounded-tr-lg">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => router.push(`/tasks/${task.id}`)}
              className="group cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 transition-colors"
            >
              {/* ── Nhiệm vụ ── */}
              <td className="px-4 py-3 max-w-[260px]">
                <div className="flex flex-col gap-0.5">
                  {task.taskCode && (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-mono text-[11px] font-bold tracking-tight text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                        #{task.taskCode}
                      </span>
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                    {task.title}
                  </span>
                </div>
              </td>

              {/* ── Ưu tiên ── */}
              <td className="px-4 py-3 whitespace-nowrap">
                {task.priority ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold"
                    style={{ backgroundColor: task.priority.color + '18', color: task.priority.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.priority.color }} />
                    {task.priority.name}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                )}
              </td>

              {/* ── Trạng thái ── */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold',
                  STATUS_STYLE[task.status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[task.status] ?? 'bg-gray-400')} />
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
              </td>

              {/* ── Người tạo ── */}
              <td className="px-4 py-3 whitespace-nowrap">
                <CreatorCell creator={task.creator} />
              </td>

              {/* ── Phụ trách ── */}
              <td className="px-4 py-3 whitespace-nowrap">
                <AssigneeAvatars assignees={task.assignees} />
              </td>

              {/* ── Deadline ── */}
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center justify-between gap-2">
                  <DeadlineBadge date={task.scheduleEnd} status={task.status} />
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

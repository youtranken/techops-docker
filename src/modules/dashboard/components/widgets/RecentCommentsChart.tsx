'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import type { RecentComment } from '@/modules/dashboard/services/stats.service';

interface RecentCommentsChartProps {
  comments: RecentComment[];
}

function timeAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
  return `${Math.floor(diff / 86400)}d trước`;
}

function Avatar({ name, color, url }: { name: string; color: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700" />;
  }
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ring-1 ring-gray-200 dark:ring-gray-700"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function RecentCommentsChart({ comments }: RecentCommentsChartProps) {
  const router = useRouter();

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
        <MessageSquare className="w-6 h-6 opacity-40" />
        <p className="text-xs">Chưa có bình luận nào</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
      {comments.map((c) => (
        <button
          key={c.id}
          onClick={() => router.push(`/tasks/${c.task.id}`)}
          className="w-full text-left flex flex-col gap-1.5 px-1 py-2.5 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-l-2 hover:border-indigo-400 transition-all group rounded-sm"
        >
          {/* Task header — nổi bật */}
          <div className="flex items-center gap-1.5 min-w-0">
            {c.task.taskCode && (
              <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-px rounded">
                {c.task.taskCode}
              </span>
            )}
            <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
              {c.task.title}
            </span>
          </div>

          {/* Comment row */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={c.author.displayName} color={c.author.avatarColor} url={c.author.avatarUrl} />
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
              {c.author.displayName}:
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate flex-1">{c.content}</span>
            <span className="text-[10px] text-gray-300 dark:text-gray-600 shrink-0 tabular-nums">{timeAgo(c.createdAt)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

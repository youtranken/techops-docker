'use client';

import { useState } from 'react';
import { MessageSquare, CalendarClock, History, ScrollText } from 'lucide-react';
import { CommentList } from '../Comments/CommentList';
import { ExtensionList } from './ExtensionList';
import { DetailAuditLog } from './DetailAuditLog';
import type { TaskDetail } from '../../services/task-query.service';

interface Props {
  task: TaskDetail;
  currentUserId: string;
  isAdmin: boolean;
  canApproveExtension: boolean;
  canWithdrawExtension: boolean;
}

type Tab = 'comments' | 'extensions';

export function DetailTabPanel({
  task, currentUserId, isAdmin, canApproveExtension, canWithdrawExtension,
}: Props) {
  const [active, setActive] = useState<Tab>('comments');
  const extCount = task.extensions.length;
  const logCount = task.auditLogs.length;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'comments',   label: 'Bình luận', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'extensions', label: 'Gia hạn',   icon: <CalendarClock className="w-3.5 h-3.5" />, badge: extCount || undefined },
  ];

  return (
    <div className="flex-1 overflow-hidden flex bg-white dark:bg-slate-900">

      {/* ── Left: Bình luận / Gia hạn ── */}
      <div className="flex-[6] min-w-0 flex flex-col border-r border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                active === tab.id
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/30',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span className="text-[10px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {active === 'comments' && (
            <CommentList taskId={task.id} currentUserId={currentUserId} isAdmin={isAdmin} embedded
              canComment={!['COMPLETED', 'CANCELLED'].includes(task.status)} />
          )}
          {active === 'extensions' && (
            <ExtensionList
              taskId={task.id} extensions={task.extensions}
              currentUserId={currentUserId}
              canApproveExtension={canApproveExtension}
              canWithdrawExtension={canWithdrawExtension}
            />
          )}
        </div>
      </div>

      {/* ── Right: Lịch sử luôn hiển thị ── */}
      <div className="flex-[4] min-w-0 flex flex-col">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900">
          <ScrollText className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">Lịch sử</span>
          {logCount > 0 && (
            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full leading-none">
              {logCount}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <DetailAuditLog auditLogs={task.auditLogs} assignees={task.assignees} embedded />
        </div>
      </div>

    </div>
  );
}

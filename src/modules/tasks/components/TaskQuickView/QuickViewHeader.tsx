'use client';

import { SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickViewHeaderProps {
  taskId: string;
  hasTask: boolean;
  onClose: () => void;
}

export function QuickViewHeader({ taskId, hasTask, onClose }: QuickViewHeaderProps) {
  const router = useRouter();

  function openDetail() {
    window.open(`/tasks/${taskId}`, '_blank');
  }

  return (
    <div className="h-14 px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
      <SheetTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <ExternalLink className="w-3 h-3" />
        </div>
        Xem nhanh công việc
      </SheetTitle>
      <div className="flex items-center gap-2">
        {hasTask && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={openDetail}>
            <ExternalLink className="w-3 h-3" />Xem đầy đủ
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

'use client';

/**
 * Nút chuyển "Danh sách | Bảng" (preview `App.viewToggle`). TaskListClient đọc/ghi tham số URL `mode`
 * + cookie nhớ lựa chọn (`board-logic.ts`); hai chế độ dùng chung `useTaskListState` (bộ lọc/tab/tìm kiếm).
 */
import { useTranslations } from 'next-intl';
import { LayoutList, Columns3 } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';

import type { TaskViewMode } from './board-logic';

export type { TaskViewMode };
export const TASK_VIEW_MODES: TaskViewMode[] = ['list', 'board'];

export function TaskViewSwitch({
  value, onChange, available = TASK_VIEW_MODES,
}: { value: TaskViewMode; onChange: (v: TaskViewMode) => void; available?: TaskViewMode[] }) {
  const t = useTranslations();
  if (available.length < 2) return null;
  return (
    <Segmented
      ariaLabel={t('tlx.viewMode')}
      className="max-[680px]:[&>button]:h-[38px] max-[680px]:[&>button]:px-3"
      value={value}
      onChange={onChange}
      options={available.map((m) => ({
        value: m,
        label: <span className="max-[1599px]:sr-only">{t(m === 'list' ? 'view.list' : 'view.board')}</span>,
        icon: m === 'list' ? LayoutList : Columns3,
      }))}
    />
  );
}

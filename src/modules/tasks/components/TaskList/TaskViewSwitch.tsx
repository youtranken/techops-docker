'use client';

/**
 * Chỗ đặt nút chuyển "Danh sách | Bảng" (preview `App.viewToggle`).
 * A2-3 mới có chế độ Danh sách → `available` chỉ có 'list' nên KHÔNG hiện gì (không hiện nút chết).
 * A2-4 (Kanban): thêm 'board' vào `TASK_VIEW_MODES`, đọc/ghi tham số URL `mode` (mặc định list) trong TaskListClient
 * và render bảng thay cho TaskListGrid — dùng chung `useTaskListState` (cùng bộ lọc/tab/tìm kiếm).
 */
import { useTranslations } from 'next-intl';
import { LayoutList, Columns3 } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';

export type TaskViewMode = 'list' | 'board';
/** Các chế độ đã có. A2-4 thêm 'board'. */
export const TASK_VIEW_MODES: TaskViewMode[] = ['list'];

export function TaskViewSwitch({
  value, onChange, available = TASK_VIEW_MODES,
}: { value: TaskViewMode; onChange: (v: TaskViewMode) => void; available?: TaskViewMode[] }) {
  const t = useTranslations();
  if (available.length < 2) return null;
  return (
    <Segmented
      ariaLabel={t('tlx.viewMode')}
      value={value}
      onChange={onChange}
      options={available.map((m) => ({
        value: m,
        label: <span className="max-[680px]:sr-only">{t(m === 'list' ? 'view.list' : 'view.board')}</span>,
        icon: m === 'list' ? LayoutList : Columns3,
      }))}
    />
  );
}

'use client';

/**
 * Bảng lọc (preview `.fpanel .fp-grid`) + chip điều kiện đang bật (`.fchips`).
 * Bộ lọc = đúng V1: Trạng thái · Ưu tiên · Loại · Nguồn · Hạn hoàn thành. Không có lọc Người làm / Người tạo (V1 không có).
 */
import { useTranslations } from 'next-intl';
import { useFormat } from '@/i18n/useFormat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FilterChip } from '@/shared/ui/FilterChip';
import { inputClass } from '@/shared/ui/Field';
import { DateFilter } from './DateFilter';
import {
  STATUS_OPTIONS, SOURCES, filterUpdate, filterChips, chipRemoveUpdate, clearFiltersUpdate,
  type ListState, type Updates, type FilterChipModel,
} from './list-logic';

interface Named { id: string; name: string }
const lbl = 'mb-1.5 block text-[13px] font-medium text-ink';

export interface TaskListFiltersProps {
  state: ListState;
  priorities: Named[];
  taskTypes: Named[];
  onUpdate: (u: Updates) => void;
  onClose: () => void;
}

export function TaskListFilters({ state, priorities, taskTypes, onUpdate, onClose }: TaskListFiltersProps) {
  const t = useTranslations();
  const unseen = state.view === 'unseen';
  const statusValue = state.status === '' ? 'active' : state.status;
  const n = filterChips(state, { priorities, taskTypes }).length;
  const sel = cn(inputClass, 'pr-8');

  return (
    <div
      id="tl-fpanel"
      role="region"
      aria-label={t('tl.f.title')}
      className="mb-4 rounded-card border border-line bg-surface px-4 pb-3 pt-3.5"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 min-[681px]:grid-cols-3 min-[1101px]:grid-cols-5">
        <div>
          <label htmlFor="tl-f-status" className={lbl}>{t('tl.f.status')}</label>
          {unseen ? (
            // V1: mục "Hoàn thành – chưa xem" khoá trạng thái ở Hoàn thành
            <select id="tl-f-status" className={sel} value="COMPLETED" disabled>
              <option value="COMPLETED">{t('st.COMPLETED')}</option>
            </select>
          ) : (
            <select id="tl-f-status" className={sel} value={statusValue} onChange={(e) => onUpdate(filterUpdate('status', e.target.value))}>
              <option value="active">{t('tlx.f.stActive')}</option>
              <option value="all">{t('tlx.f.stAll')}</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(`st.${s}`)}</option>)}
            </select>
          )}
        </div>
        <div>
          <label htmlFor="tl-f-priority" className={lbl}>{t('tl.f.priority')}</label>
          <select id="tl-f-priority" className={sel} value={state.priorityId || 'all'} onChange={(e) => onUpdate(filterUpdate('priorityId', e.target.value))}>
            <option value="all">{t('tl.f.prAll')}</option>
            {priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tl-f-type" className={lbl}>{t('tl.f.type')}</label>
          <select id="tl-f-type" className={sel} value={state.typeId || 'all'} onChange={(e) => onUpdate(filterUpdate('typeId', e.target.value))}>
            <option value="all">{t('tl.f.tyAll')}</option>
            {taskTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tl-f-source" className={lbl}>{t('tl.f.source')}</label>
          <select id="tl-f-source" className={sel} value={(SOURCES as readonly string[]).includes(state.source) ? state.source : 'all'} onChange={(e) => onUpdate(filterUpdate('source', e.target.value))}>
            <option value="all">{t('tl.f.srcAll')}</option>
            {SOURCES.map((s) => <option key={s} value={s}>{t(`tl.f.src.${s}`)}</option>)}
          </select>
        </div>
        <DateFilter state={state} onUpdate={onUpdate} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="subtle" size="xs" disabled={!n} onClick={() => onUpdate(clearFiltersUpdate(state))}>
          {t('tl.f.clear')}
        </Button>
        <Button type="button" variant="outline" size="xs" onClick={onClose}>{t('app.close')}</Button>
      </div>
    </div>
  );
}

/** Chip điều kiện đang lọc + "Xóa bộ lọc". */
export function FilterChips({ state, priorities, taskTypes, onUpdate }: Omit<TaskListFiltersProps, 'onClose'>) {
  const t = useTranslations();
  const f = useFormat();
  const chips = filterChips(state, { priorities, taskTypes });
  if (!chips.length) return null;
  const day = (iso: string) => (iso ? f.date(`${iso}T12:00:00Z`) : '…');
  const valueOf = (c: FilterChipModel) => {
    const v = c.value;
    if ('key' in v) return t(v.key);
    if ('text' in v) return v.text;
    return `${day(v.range.from)} – ${day(v.range.to)}`;
  };
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="filter-chips">
      {chips.map((c) => (
        <FilterChip key={c.key} label={t(c.label)} value={valueOf(c)} onRemove={() => onUpdate(chipRemoveUpdate(c.key))} />
      ))}
      <Button type="button" variant="link" size="xs" className="px-1" onClick={() => onUpdate(clearFiltersUpdate(state))}>
        {t('tl.f.clear')}
      </Button>
    </div>
  );
}

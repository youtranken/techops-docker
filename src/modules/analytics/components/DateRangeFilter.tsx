'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onPresetChange?: (preset: Preset) => void;
  className?: string;
}

export type Preset = 'month' | 'quarter' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'month',   label: 'Tháng' },
  { key: 'quarter', label: 'Quý' },
  { key: 'custom',  label: 'Tuỳ chọn' },
];

function getPresetRange(preset: Preset): DateRange {
  const today = dayjs();
  switch (preset) {
    case 'month':
      return {
        dateFrom: today.startOf('month').format('YYYY-MM-DD'),
        dateTo: today.endOf('month').format('YYYY-MM-DD'),
      };
    case 'quarter': {
      const qMonth = Math.floor(today.month() / 3) * 3;
      return {
        dateFrom: today.month(qMonth).startOf('month').format('YYYY-MM-DD'),
        dateTo: today.month(qMonth + 2).endOf('month').format('YYYY-MM-DD'),
      };
    }
    default:
      return { dateFrom: '', dateTo: '' };
  }
}

export function DateRangeFilter({ value, onChange, onPresetChange, className }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<Preset>('month');

  function handlePreset(preset: Preset) {
    setActivePreset(preset);
    onPresetChange?.(preset);
    if (preset !== 'custom') {
      onChange(getPresetRange(preset));
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors',
              activePreset === key
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activePreset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={value.dateFrom}
            onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            className="h-8 text-sm w-36"
          />
          <span className="text-gray-400 text-sm">—</span>
          <Input
            type="date"
            value={value.dateTo}
            onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
            className="h-8 text-sm w-36"
          />
        </div>
      )}
    </div>
  );
}

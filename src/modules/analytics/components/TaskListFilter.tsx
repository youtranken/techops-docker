'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type TLPreset = 'month' | 'year' | 'custom';

export interface TLDateRange {
  dateFrom: string;
  dateTo: string;
  preset: TLPreset;
}

interface TaskListFilterProps {
  value: TLDateRange;
  onChange: (v: TLDateRange) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2024 }, (_, i) => 2025 + i);
const MONTHS = [
  { value: 0, label: 'Tất cả Tháng' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` })),
];

function buildRange(month: number, year: number): TLDateRange {
  if (month === 0) {
    return { preset: 'year', dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }
  const d = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  return { preset: 'month', dateFrom: d.startOf('month').format('YYYY-MM-DD'), dateTo: d.endOf('month').format('YYYY-MM-DD') };
}

export function TaskListFilter({ value, onChange }: TaskListFilterProps) {
  const [isCustom, setIsCustom] = useState(value.preset === 'custom');
  const [month, setMonth]       = useState(value.preset === 'year' ? 0 : dayjs().month() + 1);
  const [year, setYear]         = useState(CURRENT_YEAR);
  const [customFrom, setCustomFrom] = useState(value.dateFrom);
  const [customTo, setCustomTo]     = useState(value.dateTo);

  useEffect(() => {
    if (!isCustom) {
      onChange(buildRange(month, year));
    }
  }, [month, year, isCustom]);

  function handleCustomChange(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    onChange({ preset: 'custom', dateFrom: from, dateTo: to });
  }

  function toggleCustom() {
    const next = !isCustom;
    setIsCustom(next);
    if (!next) onChange(buildRange(month, year));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isCustom ? (
        <>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
          >
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input type="date" value={customFrom} onChange={(e) => handleCustomChange(e.target.value, customTo)} className="h-8 text-sm w-36" />
          <span className="text-gray-400 text-sm">—</span>
          <Input type="date" value={customTo} onChange={(e) => handleCustomChange(customFrom, e.target.value)} className="h-8 text-sm w-36" />
        </div>
      )}

      <button
        onClick={toggleCustom}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
          isCustom
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
        )}
      >
        Tuỳ chọn
      </button>
    </div>
  );
}

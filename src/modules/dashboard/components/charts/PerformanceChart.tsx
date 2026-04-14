'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { usePerformanceTrend } from '../../hooks/usePerformanceTrend';

const RANGE_OPTIONS = [
  { label: '30 ngày', value: 30 },
  { label: '7 ngày', value: 7 },
] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function PerformanceChart() {
  const [days, setDays] = useState<7 | 30>(30);
  const { data, isLoading } = usePerformanceTrend(days);
  const chartData = data?.map((p) => ({ ...p, day: formatDate(p.date) })) ?? [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Xu hướng {days} ngày qua
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Task tạo mới vs hoàn thành theo ngày
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setDays(opt.value)}
              className={['px-3 py-1 text-xs font-medium rounded-md transition-colors',
                days === opt.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'].join(' ')}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="h-[220px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              formatter={(value, name) => [value, name === 'created' ? 'Tạo mới' : 'Hoàn thành']}
              labelFormatter={(l) => `Ngày ${l}`}
            />
            <Legend formatter={(v) => (<span style={{ fontSize: '12px', color: '#6b7280' }}>{v === 'created' ? 'Tạo mới' : 'Hoàn thành'}</span>)} />
            <Area type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} fill="url(#gradCreated)" dot={false} />
            <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#gradCompleted)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

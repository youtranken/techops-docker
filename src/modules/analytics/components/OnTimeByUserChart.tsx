'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { UserPerformance } from '../services/analytics.service';

interface OnTimeByUserChartProps {
  data: UserPerformance[];
}

function getBarColor(rate: number): string {
  if (rate >= 80) return '#10b981';
  if (rate >= 50) return '#f59e0b';
  return '#f87171';
}

export function OnTimeByUserChart({ data }: OnTimeByUserChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
        Chưa có dữ liệu
      </div>
    );
  }

  const chartData = data.slice(0, 12).map((u) => ({
    name: u.displayName.split(' ').pop() ?? u.displayName,
    fullName: u.displayName,
    rate: u.onTimeRate,
    completed: u.tasksCompleted,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 12, bottom: 4, left: -10 }}
        barCategoryGap="35%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          contentStyle={{ borderRadius: '8px', fontSize: '13px', border: '1px solid #e5e7eb' }}
          formatter={(value) => [`${(value as number | undefined) ?? 0}%`, 'Đúng hạn']}
          labelFormatter={(_: unknown, payload) => {
            const items = payload as unknown as Array<{ payload: { fullName: string; completed: number } }>;
            return items?.[0] ? `${items[0].payload.fullName} · ${items[0].payload.completed} tasks` : '';
          }}
        />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.rate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

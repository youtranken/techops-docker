'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyOverview } from '../services/analytics.service';

interface MonthlyOverviewChartProps {
  data: MonthlyOverview[];
}

export function MonthlyOverviewChart({ data }: MonthlyOverviewChartProps) {
  if (data.length === 0 || data.every((d) => d.created === 0 && d.completed === 0)) {
    return (
      <div className="flex items-center justify-center h-[320px] text-gray-400 text-sm">
        Chưa có dữ liệu
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.monthLabel,
    'Tạo mới': d.created,
    'Hoàn thành': d.completed,
    'Đúng hạn %': d.onTimeRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="count" tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="rate"
          orientation="right"
          tick={{ fontSize: 11 }}
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
          formatter={(value, name) =>
            (name as string) === 'Đúng hạn %'
              ? [`${(value as number | undefined) ?? 0}%`, name as string]
              : [(value as number | undefined) ?? 0, (name as string | undefined) ?? '']
          }
        />
        <Legend />
        <Bar yAxisId="count" dataKey="Tạo mới" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="count" dataKey="Hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="Đúng hạn %"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

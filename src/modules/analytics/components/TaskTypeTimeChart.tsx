'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { TaskTypeTime } from '../services/analytics.service';

interface TaskTypeTimeChartProps {
  data: TaskTypeTime[];
}

export function TaskTypeTimeChart({ data }: TaskTypeTimeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
        Chưa có dữ liệu
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.name,
    avgDays: d.avgDays,
    taskCount: d.taskCount,
    color: d.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 5, right: 40, bottom: 5, left: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          unit=" ngày"
          domain={[0, 'auto']}
          allowDecimals={false}
        />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
          formatter={(value, _name, props) => [
            `${(value as number | undefined) ?? 0} ngày (${props.payload.taskCount} tasks)`,
            'TB hoàn thành',
          ]}
        />
        <Bar dataKey="avgDays" radius={[0, 4, 4, 0]} maxBarSize={28} minPointSize={4}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color || '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

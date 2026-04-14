'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { WorkloadEntry } from '../services/research.service';

interface WorkloadChartProps {
  data: WorkloadEntry[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16'];

export function WorkloadChart({ data }: WorkloadChartProps) {
  const active = data.filter((u) => u.totalActive > 0);

  if (active.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
        Không có ai đang có task active
      </div>
    );
  }

  const chartData = active.map((u) => ({
    name: u.displayName.split(' ').pop() ?? u.displayName,
    fullName: u.displayName,
    value: u.totalActive,
    inProgress: u.inProgressCount,
    pending: u.pendingCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={58}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', fontSize: '13px', border: '1px solid #e5e7eb' }}
          formatter={(value, _name, props) => [
            `${(value as number | undefined) ?? 0} tasks (đang: ${props.payload.inProgress}, chờ: ${props.payload.pending})`,
            props.payload.fullName,
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

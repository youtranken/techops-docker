'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface WorkflowDonutProps {
  data: { IMMEDIATE: number; NEED_APPROVAL: number };
}

const ITEMS = [
  { key: 'IMMEDIATE',    label: 'Trực tiếp',   color: '#f59e0b' },
  { key: 'NEED_APPROVAL', label: 'Phê duyệt', color: '#8b5cf6' },
] as const;

export function WorkflowDonut({ data }: WorkflowDonutProps) {
  const chartData = ITEMS
    .map((item) => ({ name: item.label, value: data[item.key], color: item.color }))
    .filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%" cy="50%"
          outerRadius={66} innerRadius={38}
          dataKey="value"
          paddingAngle={3}
          labelLine={false}
          label={(props) => {
            const { cx, cy, midAngle, innerRadius, outerRadius, value, percent } = props;
            if (!value || midAngle == null || !percent) return null;
            const RADIAN = Math.PI / 180;
            const r = innerRadius + (outerRadius - innerRadius) * 0.55;
            const x = (cx as number) + r * Math.cos(-midAngle * RADIAN);
            const y = (cy as number) + r * Math.sin(-midAngle * RADIAN);
            return (
              <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          }}
        >
          {chartData.map((entry, i) => (
            <Cell key={`wf-${i}`} fill={entry.color} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
        />
        <Legend
          iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ fontSize: '12px', color: '#6b7280' }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

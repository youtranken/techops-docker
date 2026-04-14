'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PriorityItem {
  priorityId: string;
  name: string;
  color: string;
  count: number;
}

interface PriorityBreakdownProps {
  data: PriorityItem[];
  total: number;
}

export function PriorityBreakdown({ data }: PriorityBreakdownProps) {
  const chartData = data.filter((d) => d.count > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%" cy="50%"
          outerRadius={72} innerRadius={40}
          dataKey="count"
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
            <Cell key={`p-${i}`} fill={entry.color} strokeWidth={0} />
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

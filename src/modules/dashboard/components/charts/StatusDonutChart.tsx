'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatusDonutChartProps {
  data: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:               { label: 'Nháp',           color: '#cbd5e1' },
  PENDING_APPROVAL:    { label: 'Chờ duyệt',      color: '#8b5cf6' },
  WAITING_ACKNOWLEDGE: { label: 'Chờ tiếp nhận',  color: '#9ca3af' },
  IN_PROGRESS:         { label: 'Đang làm',        color: '#f97316' },
  PENDING_REVIEW:      { label: 'Chờ nghiệm thu',  color: '#3b82f6' },
  COMPLETED:           { label: 'Hoàn thành',      color: '#10b981' },
  CANCELLED:           { label: 'Đã huỷ',          color: '#ef4444' },
};

export function StatusDonutChart({ data }: StatusDonutChartProps) {
  const chartData = Object.entries(data)
    .filter(([status, count]) => count > 0 && status in STATUS_CONFIG)
    .map(([status, count]) => ({
      name: STATUS_CONFIG[status].label,
      value: count,
      color: STATUS_CONFIG[status].color,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%" cy="50%"
          outerRadius={90} innerRadius={52}
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
            <Cell key={`s-${i}`} fill={entry.color} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [value, '']}
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

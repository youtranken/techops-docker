import { Flame, ArrowUp, Minus, ArrowDown } from 'lucide-react';

interface PriorityBadgeProps {
  name: string;
  color: string;
  level?: number;
}

function getIconByLevel(level?: number) {
  if (level === 4) return Flame;
  if (level === 3) return ArrowUp;
  if (level === 2) return Minus;
  return ArrowDown;
}

export function PriorityBadge({ name, color, level }: PriorityBadgeProps) {
  const Icon = getIconByLevel(level);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border"
      style={{ color, borderColor: color + '50', backgroundColor: color + '15' }}
    >
      <Icon className="w-3 h-3" />
      {name}
    </span>
  );
}

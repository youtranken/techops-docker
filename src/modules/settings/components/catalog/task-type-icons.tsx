/**
 * 24 biểu tượng chọn được cho Loại công việc — đúng danh sách IconPicker V1 (Lucide, lưu TÊN icon vào TaskType.icon).
 * Import từng icon (không `import *` cả thư viện như V1).
 */
import {
  Monitor, Cpu, Wifi, Server, HardDrive, Wrench, Code, Globe, Database, Shield, Printer, Phone, Mail, Lock, Settings, Zap,
  Bug, FileText, Users, Package, Cloud, Terminal, Network, LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const TASK_TYPE_ICONS = {
  Monitor, Cpu, Wifi, Server, HardDrive, Wrench, Code, Globe, Database, Shield, Printer, Phone, Mail, Lock, Settings, Zap,
  Bug, FileText, Users, Package, Cloud, Terminal, Network, LayoutGrid,
} as const;
export type TaskTypeIconName = keyof typeof TASK_TYPE_ICONS;
export const TASK_TYPE_ICON_NAMES = Object.keys(TASK_TYPE_ICONS) as TaskTypeIconName[];

/** Icon theo tên đã lưu; tên lạ (dữ liệu cũ) → hiện chữ viết tắt như V1 hiện tên */
export function TaskTypeGlyph({ name, className }: { name?: string | null; className?: string }) {
  const Icon = name ? TASK_TYPE_ICONS[name as TaskTypeIconName] : undefined;
  if (!Icon) return <span aria-hidden className={cn('font-mono text-[10px] text-ink-3', className)}>{(name ?? '').slice(0, 2)}</span>;
  return <Icon aria-hidden className={cn('size-4', className)} />;
}

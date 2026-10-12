'use client';

import { CheckCircle2, Eye } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { HelpdeskPendingItem } from '@/modules/helpdesk/types';
import { isCompletedTrangThai } from '@/modules/helpdesk/config/ticket-status';
import { UuTienBadge, TrangThaiBadge } from './StatusBadge';

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return dateStr ?? '—';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface HelpdeskTicketRowProps {
  item:           HelpdeskPendingItem;
  onAssign:       (item: HelpdeskPendingItem) => void;
  onDelete:       (id: string) => void;
  onViewDetail:   (item: HelpdeskPendingItem) => void;
  isSelected:     boolean;
  onToggleSelect: (id: string) => void;
}

export function HelpdeskTicketRow({ item, onAssign, onDelete, onViewDetail, isSelected, onToggleSelect }: HelpdeskTicketRowProps) {
  const isPushed = item.status === 'PUSHED';
  const isCompleted = isCompletedTrangThai(item.trangThai);
  const isNeedsAttention = isCompleted && !item.itSupport && item.status === 'UNASSIGNED';

  return (
    <TableRow
      className={`cursor-pointer ${
        isPushed          ? 'bg-green-50/50 dark:bg-green-900/20 opacity-75' :
        isNeedsAttention  ? 'bg-red-50/70 dark:bg-red-950/25 hover:bg-red-50 dark:hover:bg-red-950/40' :
                            'hover:bg-muted/40'
      } ${isSelected ? 'ring-1 ring-inset ring-primary/30' : ''}`}
      onClick={() => onViewDetail(item)}
    >
      {/* Checkbox */}
      <TableCell className="w-8 px-3" onClick={(e) => e.stopPropagation()}>
        {!isPushed && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(item.id)}
            className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
          />
        )}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
        {item.hdId}
      </TableCell>
      <TableCell className="text-foreground max-w-[200px] truncate" title={item.tieuDe}>
        {item.tieuDe}
      </TableCell>
      <TableCell className="text-foreground/80 whitespace-nowrap">{item.nhanVien}</TableCell>
      <TableCell className="text-foreground/80 whitespace-nowrap">{item.phongBan}</TableCell>
      <TableCell className="whitespace-nowrap">
        <UuTienBadge uuTien={item.uuTien} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <TrangThaiBadge trangThai={item.trangThai} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {item.itSupport ? (
          <span className="text-foreground font-medium">{item.itSupport}</span>
        ) : (
          <span className="text-muted-foreground italic text-xs">Chưa có</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {formatDate(item.thoiGian)}
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {isCompleted
          ? formatDate(item.ngayHoanThanh)
          : <span className="text-muted-foreground/30 text-xs">—</span>
        }
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {isPushed ? (
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Đã tạo Task
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Xem chi tiết"
              onClick={(e) => { e.stopPropagation(); onViewDetail(item); }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="h-7 text-xs px-2.5" onClick={(e) => { e.stopPropagation(); onAssign(item); }}>
              Gán người
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 text-xs px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            >
              Xóa
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

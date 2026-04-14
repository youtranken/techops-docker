'use client';

import { Loader2, Inbox } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { HelpdeskPendingItem } from '@/modules/helpdesk/types';
import { HelpdeskTicketRow } from './HelpdeskTicketRow';

interface HelpdeskTicketTableProps {
  data:           HelpdeskPendingItem[];
  isLoading:      boolean;
  onAssign:       (item: HelpdeskPendingItem) => void;
  onDelete:       (id: string) => void;
  onViewDetail:   (item: HelpdeskPendingItem) => void;
  selectedIds:    Set<string>;
  onToggleSelect: (id: string) => void;
}

const COLUMNS = ['', 'Code', 'Tiêu đề', 'Nhân viên', 'Phòng ban', 'Ư u tiên', 'Trạng thái', 'IT Support', 'Ngày tạo', 'Hoàn thành', 'Thao tác'];

export function HelpdeskTicketTable({ data, isLoading, onAssign, onDelete, onViewDetail, selectedIds, onToggleSelect }: HelpdeskTicketTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-xs">Đang tải...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
        <Inbox className="h-8 w-8 opacity-40" />
        <p className="text-sm">Không có ticket nào trong danh sách</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {COLUMNS.map((col) => (
              <TableHead
                key={col}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <HelpdeskTicketRow
              key={item.id}
              item={item}
              onAssign={onAssign}
              onDelete={onDelete}
              onViewDetail={onViewDetail}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

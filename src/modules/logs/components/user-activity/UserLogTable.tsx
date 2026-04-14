'use client';

import { Loader2, Inbox } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { UserLogRow } from './UserLogRow';
import type { UserLogEntry } from '../../types';

const COLUMNS = [
  'Thời gian', 'Người dùng', 'Hành động', 'Chi tiết', 'Thiết bị',
  'IP Address', 'Provider / ISP', 'Quốc gia',
];

interface Props {
  logs: UserLogEntry[];
  isLoading: boolean;
}

export function UserLogTable({ logs, isLoading }: Props) {
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
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-14">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-xs">Đang tải...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-14">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-40" />
                  <span className="text-sm">Không có dữ liệu</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => <UserLogRow key={log.id} log={log} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}

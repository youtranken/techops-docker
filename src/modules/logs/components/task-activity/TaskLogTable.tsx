'use client';

import { Loader2, Inbox } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TaskLogRow } from './TaskLogRow';
import type { TaskLogEntry } from '../../types';

const COLUMNS = ['Thời gian', 'Task Code', 'Task ID', 'Tiêu đề', 'Hành động', 'Trạng thái', 'Người thực hiện'];

interface Props {
  logs: TaskLogEntry[];
  isLoading: boolean;
}

export function TaskLogTable({ logs, isLoading }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {COLUMNS.map((col) => (
              <TableHead
                key={col}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-14">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-xs">Đang tải...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-14">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-40" />
                  <span className="text-sm">Không có dữ liệu</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => <TaskLogRow key={log.id} log={log} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}

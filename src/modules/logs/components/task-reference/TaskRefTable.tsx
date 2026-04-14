'use client';

import { useState } from 'react';
import { Loader2, Inbox, Copy, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TaskRefEntry } from '../../types';

const COLUMNS = ['STT', 'Task Code', 'Task ID', 'Tiêu đề', 'Người tạo', 'Ngày tạo', 'Schedule'];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors" title="Copy">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function TaskRefRow({ entry, index }: { entry: TaskRefEntry; index: number }) {
  return (
    <TableRow className="text-sm hover:bg-muted/40">
      <TableCell className="text-xs text-muted-foreground font-medium w-10">{index}</TableCell>
      <TableCell>
        <span className="font-mono font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-xs">
          {entry.taskCode ?? '—'}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">{entry.id}</span>
          <CopyButton value={entry.id} />
        </div>
      </TableCell>
      <TableCell className="max-w-[220px] truncate">{entry.title}</TableCell>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {entry.creator.displayName}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{fmt(entry.createdAt)}</TableCell>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {fmt(entry.scheduleStart)} → {fmt(entry.scheduleEnd)}
      </TableCell>
    </TableRow>
  );
}

interface Props { entries: TaskRefEntry[]; isLoading: boolean; startIndex?: number }

export function TaskRefTable({ entries, isLoading, startIndex = 1 }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {COLUMNS.map((col) => (
              <TableHead key={col} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
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
          ) : entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-14">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-40" />
                  <span className="text-sm">Không có dữ liệu</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            entries.map((e, i) => <TaskRefRow key={e.id} entry={e} index={startIndex + i} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}

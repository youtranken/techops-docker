'use client';

import { useState } from 'react';
import { useTaskAuditLogs } from '../hooks/useTaskAuditLogs';
import { TaskLogFilters } from '../components/task-activity/TaskLogFilters';
import { TaskLogTable } from '../components/task-activity/TaskLogTable';
import { LogPagination } from '../components/shared/LogPagination';
import type { TaskLogFilters as TFilters } from '../types';

const DEFAULT_FILTERS: TFilters = { page: 1, limit: 20 };

export function TaskActivitySection() {
  const [filters, setFilters] = useState<TFilters>(DEFAULT_FILTERS);

  const { data, isLoading } = useTaskAuditLogs(filters);

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  function handleChange(patch: Partial<TFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="space-y-4">
      <TaskLogFilters filters={filters} onChange={handleChange} />
      <TaskLogTable logs={logs} isLoading={isLoading} />
      {pagination && (
        <LogPagination
          pagination={pagination}
          onPageChange={(p) => handleChange({ page: p })}
        />
      )}
    </div>
  );
}

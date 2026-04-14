'use client';

import { useState } from 'react';
import { useTaskReferenceLogs } from '../hooks/useTaskReferenceLogs';
import { TaskRefFilters } from '../components/task-reference/TaskRefFilters';
import { TaskRefTable } from '../components/task-reference/TaskRefTable';
import { LogPagination } from '../components/shared/LogPagination';
import type { TaskRefFilters as TFilters } from '../types';

const DEFAULT_FILTERS: TFilters = { page: 1, limit: 20 };

export function TaskReferenceSection() {
  const [filters, setFilters] = useState<TFilters>(DEFAULT_FILTERS);
  const { data, isLoading } = useTaskReferenceLogs(filters);

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  function handleChange(patch: Partial<TFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="space-y-4">
      <TaskRefFilters filters={filters} onChange={handleChange} />
      <TaskRefTable entries={entries} isLoading={isLoading}
        startIndex={((filters.page ?? 1) - 1) * (filters.limit ?? 20) + 1} />
      {pagination && (
        <LogPagination
          pagination={pagination}
          onPageChange={(p) => handleChange({ page: p })}
        />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useUserActivityLogs } from '../hooks/useUserActivityLogs';
import { UserLogFilters } from '../components/user-activity/UserLogFilters';
import { UserLogTable } from '../components/user-activity/UserLogTable';
import { LogPagination } from '../components/shared/LogPagination';
import type { UserLogFilters as UFilters } from '../types';

const DEFAULT_FILTERS: UFilters = { page: 1, limit: 20 };

export function UserActivitySection() {
  const [filters, setFilters] = useState<UFilters>(DEFAULT_FILTERS);

  const { data, isLoading } = useUserActivityLogs(filters);

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  function handleChange(patch: Partial<UFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="space-y-4">
      <UserLogFilters filters={filters} onChange={handleChange} />
      <UserLogTable logs={logs} isLoading={isLoading} />
      {pagination && (
        <LogPagination
          pagination={pagination}
          onPageChange={(p) => handleChange({ page: p })}
        />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SyncResult } from '@/modules/helpdesk/types';
import { ManualImportCard } from '../components/import/ManualImportCard';

export function ImportSection() {
  const qc = useQueryClient();
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  function handleSuccess(result: SyncResult) {
    setLastResult(result);
    void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
    void qc.invalidateQueries({ queryKey: ['helpdesk-filter-options'] });
  }

  return <ManualImportCard onSuccess={handleSuccess} lastResult={lastResult} />;
}

'use client';

import { useMutation } from '@tanstack/react-query';
import type { PushResult } from '@/modules/helpdesk/types';

// Re-export for backwards compat during migration (consumers should import from types.ts)
export type { PushResult };

async function pushToTasks(): Promise<PushResult> {
  const res = await fetch('/api/integrations/helpdesk/push-to-tasks', {
    method: 'POST',
  });
  const json = await res.json() as PushResult & { error?: string | { code?: string; message?: string } };
  if (!res.ok) {
    const errMsg = typeof json.error === 'object'
      ? (json.error?.message ?? `HTTP ${res.status}`)
      : (json.error ?? `HTTP ${res.status}`);
    throw new Error(errMsg);
  }
  return json;
}

export function usePushToTasks() {
  return useMutation<PushResult, Error>({
    mutationFn: pushToTasks,
  });
}

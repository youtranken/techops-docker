'use client';

import { useEffect } from 'react';
import { ServerErrorScreen } from '@/shared/ui/ErrorScreen';

/** 500 trong khung app: lỗi khi render trang con — sidebar/topbar vẫn dùng được, có nút Thử lại. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);
  return <ServerErrorScreen onRetry={reset} code={error.digest} />;
}

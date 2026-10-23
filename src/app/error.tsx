'use client';

import { useEffect } from 'react';
import { ServerErrorScreen } from '@/shared/ui/ErrorScreen';

/** 500 ngoài khung app (vd. nhóm (auth) hoặc lỗi ở layout khung). */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[RootError]', error);
  }, [error]);
  return (
    <main className="bg-canvas px-4">
      <ServerErrorScreen standalone onRetry={reset} code={error.digest} />
    </main>
  );
}

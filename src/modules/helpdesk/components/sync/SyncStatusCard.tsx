'use client';

import type { SyncResult } from '@/modules/helpdesk/types';

interface SyncStatusCardProps {
  onSync:    () => void;
  isLoading: boolean;
  result:    SyncResult | null;
  error:     Error | null;
}

export function SyncStatusCard({ onSync, isLoading, result, error }: SyncStatusCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Get từ API (giả lập auto-fetch)</p>

        {result && !isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kết quả:{' '}
            <span className="text-green-600 dark:text-green-400 font-medium">{result.synced} task mới</span>
            {' · '}
            <span className="text-amber-600 dark:text-amber-400 font-medium">{result.pending} chờ gán</span>
            {' · '}
            <span className="text-gray-400 font-medium">{result.skipped} bỏ qua</span>
            {result.errors.length > 0 && (
              <>
                {' · '}
                <span className="text-red-500 font-medium">{result.errors.length} lỗi</span>
              </>
            )}
          </p>
        )}

        {error && !isLoading && (
          <p className="text-sm text-red-500">Sync thất bại: {error.message}</p>
        )}

        {!result && !error && !isLoading && (
          <p className="text-sm text-gray-400 dark:text-gray-500">Bấm nút để lấy ticket từ API — chỉ lấy code năm hiện tại (26xx, 27xx...)</p>
        )}

        {isLoading && (
          <p className="text-sm text-blue-500 dark:text-blue-400 animate-pulse">Đang đồng bộ...</p>
        )}
      </div>

      <button
        onClick={onSync}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors shrink-0"
      >
        <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
        {isLoading ? 'Đang lấy...' : 'Get từ API'}
      </button>
    </div>
  );
}

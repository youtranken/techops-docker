'use client';

import { useState } from 'react';
import type { SyncResult } from '@/modules/helpdesk/types';

interface ManualImportCardProps {
  onSuccess:  (result: SyncResult) => void;
  lastResult: SyncResult | null;
}

export function ManualImportCard({ onSuccess, lastResult }: ManualImportCardProps) {
  const [json, setJson]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function validateJson(value: string) {
    setJson(value);
    setParseError(null);
    if (!value.trim()) return;
    try {
      JSON.parse(value);
    } catch {
      setParseError('JSON không hợp lệ — kiểm tra lại cú pháp');
    }
  }

  async function handleImport() {
    if (!json.trim() || parseError) return;

    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch {
      setParseError('JSON không hợp lệ'); return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/helpdesk/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ manualData: parsed }),
      });
      const data = await res.json() as SyncResult & { error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? 'Import thất bại');
      setJson('');
      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-800 dark:text-gray-100">📋 Nhập dữ liệu từ API</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Paste JSON từ Helpdesk API (array hoặc {'{ success, data: [...] }'})
          </span>
        </div>

        {/* Kết quả lần nhập gần nhất */}
        {lastResult && !loading && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-400 dark:text-gray-500">Lần nhập gần nhất:</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✓ {lastResult.synced} task tạo tự động
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              ⏳ {lastResult.pending} chờ gán
            </span>
            <span className="text-gray-400 font-medium">
              ⏭ {lastResult.skipped} bỏ qua (trùng)
            </span>
            {lastResult.errors.length > 0 && (
              <span className="text-red-500 font-medium">
                ✕ {lastResult.errors.length} lỗi
              </span>
            )}
          </div>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={json}
        onChange={(e) => validateJson(e.target.value)}
        placeholder={`Paste JSON response từ Helpdesk API vào đây...\n\nVí dụ:\n[\n  {\n    "Code": "260003",\n    "Tiêu đề": "Hỗ trợ cài đặt phần mềm",\n    "Trạng thái": "Completed",\n    "IT Support": "Le Minh",\n    "Ngày tạo": "2026-01-13",\n    "TimeStamp": "2026-01-15 10:00:00",\n    ...\n  }\n]`}
        rows={8}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />

      {parseError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>⚠️</span> {parseError}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>❌</span> {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Nhận tất cả records · Ticket có IT Support → tạo Task tự động · Không có IT → vào danh sách chờ gán
        </p>
        <button
          onClick={() => void handleImport()}
          disabled={!json.trim() || !!parseError || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors shrink-0"
        >
          {loading
            ? <><span className="animate-spin">⏳</span> Đang xử lý...</>
            : '📥 Nhập dữ liệu'}
        </button>
      </div>
    </div>
  );
}

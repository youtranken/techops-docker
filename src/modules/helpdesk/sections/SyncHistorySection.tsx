'use client';

import { useState } from 'react';
import { History, ChevronDown, ChevronUp, AlertCircle, ChevronRight } from 'lucide-react';
import { useHelpdeskSyncLogs } from '../hooks/useHelpdeskSync';

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

export function SyncHistorySection() {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [expanded, setExpanded]             = useState(false);
  const { data: logs, isLoading } = useHelpdeskSyncLogs();


  const displayedLogs = (logs ?? []).slice(0, 5);

  function toggleErrors(id: string) {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }



  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4 text-muted-foreground" />
          Lịch sử đồng bộ
          {logs && logs.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              (5 lần gần nhất)
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {expanded && (
        <div className="border-t border-border">
          {isLoading ? (
            <p className="text-xs text-muted-foreground px-5 py-4 animate-pulse">Đang tải...</p>
          ) : !logs || logs.length === 0 ? (
            <p className="text-xs text-muted-foreground px-5 py-4">Chưa có lần sync nào.</p>
          ) : (
            <div className="divide-y divide-border">
              {displayedLogs.map((log) => (
                <div key={log.id}>
                  <div className="px-5 py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        log.mode === 'auto'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {log.mode === 'auto' ? 'Tự động' : 'Thủ công'}
                      </span>
                      <span className="text-muted-foreground">{formatDateTime(log.ranAt)}</span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <span className="text-green-700 font-medium">+{log.synced} task</span>
                      {log.pending > 0 && (
                        <span className="text-amber-600">{log.pending} chờ gán</span>
                      )}
                      <span className="text-muted-foreground">{log.skipped} bỏ qua</span>
                      <span className="text-muted-foreground">{log.fetchedCount} fetched</span>
                      {log.errors > 0 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleErrors(log.id)}
                            className="flex items-center gap-0.5 text-destructive font-medium hover:underline"
                          >
                            <AlertCircle className="h-3 w-3" />
                            {log.errors} lỗi
                            <ChevronRight className={`h-3 w-3 transition-transform ${expandedErrors.has(log.id) ? 'rotate-90' : ''}`} />
                          </button>

                        </div>
                      )}
                    </div>
                  </div>

                  {log.errors > 0 && expandedErrors.has(log.id) && log.errorDetail && log.errorDetail.length > 0 && (
                    <div className="px-5 pb-3 space-y-1">
                      {log.errorDetail.map((e, i) => (
                        <div key={i} className="text-xs text-destructive bg-destructive/5 rounded px-2 py-1">
                          <span className="font-mono">{e.hdId ?? '?'}</span> — {e.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CalendarClock, X } from 'lucide-react';
import { ApproveExtensionModal } from '../../actions/components/modals/ApproveExtensionModal';
import { useApproveExtension, useRejectExtension, useWithdrawExtension } from '../../actions/hooks/useExtensions';

interface Extension {
  id: string;
  reason: string;
  requestedDate: Date | string;
  status: string;
  responseNote?: string | null;
  requester?: { id: string; displayName: string };
}

interface ExtensionListProps {
  taskId: string;
  extensions: Extension[];
  currentUserId: string;
  canApproveExtension: boolean;
  canWithdrawExtension: boolean;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'Chờ duyệt', variant: 'secondary' },
  APPROVED: { label: 'Đã duyệt', variant: 'default' },
  REJECTED: { label: 'Từ chối', variant: 'destructive' },
};

export function ExtensionList({
  taskId, extensions, currentUserId, canApproveExtension, canWithdrawExtension,
}: ExtensionListProps) {
  const [reviewExt, setReviewExt] = useState<Extension | null>(null);
  const approve = useApproveExtension();
  const reject = useRejectExtension();
  const withdraw = useWithdrawExtension();

  if (extensions.length === 0) return (
    <p className="text-sm text-slate-400 text-center py-6">Chưa có yêu cầu gia hạn nào.</p>
  );

  return (
    <>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Yêu cầu gia hạn ({extensions.length}/3)
        </p>
        <Separator />
        <div className="space-y-3">
          {extensions.map((ext) => {
            const s = STATUS_MAP[ext.status] ?? STATUS_MAP.PENDING;
            const isOwn = ext.requester?.id === currentUserId;
            return (
              <div key={ext.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(ext.requestedDate).toLocaleDateString('vi-VN')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                    {ext.status === 'PENDING' && canApproveExtension && (
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setReviewExt(ext)}>
                        Xem xét
                      </Button>
                    )}
                    {ext.status === 'PENDING' && isOwn && canWithdrawExtension && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => withdraw.mutate({ taskId, extId: ext.id })}
                        disabled={withdraw.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300">{ext.reason}</p>
                {ext.responseNote && (
                  <p className="text-xs text-muted-foreground italic">↳ {ext.responseNote}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ApproveExtensionModal
        open={Boolean(reviewExt)}
        onClose={() => setReviewExt(null)}
        extension={reviewExt ? {
          id: reviewExt.id,
          reason: reviewExt.reason,
          requestedDate: reviewExt.requestedDate,
          requesterName: reviewExt.requester?.displayName ?? 'Unknown',
        } : null}
        isLoading={approve.isPending || reject.isPending}
        onApprove={(extId, note) => approve.mutate({ taskId, extId, responseNote: note })}
        onReject={(extId, note) => reject.mutate({ taskId, extId, responseNote: note })}
      />
    </>
  );
}

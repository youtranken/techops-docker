'use client';

import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ExtensionInfo {
  id: string;
  reason: string;
  requestedDate: Date | string;
  requesterName: string;
}

interface ApproveExtensionModalProps {
  open: boolean;
  onClose: () => void;
  extension: ExtensionInfo | null;
  onApprove: (extId: string, note?: string) => void;
  onReject: (extId: string, note?: string) => void;
  isLoading?: boolean;
}

export function ApproveExtensionModal({
  open, onClose, extension, onApprove, onReject, isLoading = false,
}: ApproveExtensionModalProps) {
  const [note, setNote] = useState('');

  function handleClose() {
    setNote('');
    onClose();
  }

  if (!extension) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
        <div className="bg-amber-50 dark:bg-amber-950/30 pt-5 pb-3 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto mb-2 ring-4 ring-amber-200/60 dark:ring-amber-800/30">
            <CalendarCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">Xem xét yêu cầu gia hạn</DialogTitle>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2 rounded-md border p-3 bg-gray-100/30 dark:bg-slate-700/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{extension.requesterName}</span>
              <Badge variant="outline" className="text-xs">Đang chờ</Badge>
            </div>
            <p className="text-xs text-gray-500">
              Ngày đề xuất: <span className="font-medium text-gray-900 dark:text-slate-100">
                {new Date(extension.requestedDate).toLocaleDateString('vi-VN')}
              </span>
            </p>
            <p className="text-sm">{extension.reason}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Ghi chú phản hồi</Label>
            <Textarea
              id="note"
              placeholder="Ghi chú cho người xin gia hạn (không bắt buộc)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-0">
          <Button
            onClick={() => { onApprove(extension.id, note); handleClose(); }}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white border-0"
          >
            Duyệt gia hạn
          </Button>
          <Button
            onClick={() => { onReject(extension.id, note); handleClose(); }}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white border-0"
          >
            Từ chối
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

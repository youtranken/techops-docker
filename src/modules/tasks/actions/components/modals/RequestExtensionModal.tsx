'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface RequestExtensionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, requestedDate: string) => void;
  currentDeadline: Date | string;
  isLoading?: boolean;
}

export function RequestExtensionModal({
  open, onClose, onConfirm, currentDeadline, isLoading = false,
}: RequestExtensionModalProps) {
  const [reason, setReason] = useState('');
  const [requestedDate, setRequestedDate] = useState('');

  const minDate = new Date(currentDeadline);
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 10);

  function handleClose() {
    setReason('');
    setRequestedDate('');
    onClose();
  }

  function handleConfirm() {
    if (!reason.trim() || !requestedDate) return;
    onConfirm(reason.trim(), new Date(requestedDate).toISOString());
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
        <div className="bg-amber-50 dark:bg-amber-950/30 pt-5 pb-3 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto mb-2 ring-4 ring-amber-200/60 dark:ring-amber-800/30">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">Xin gia hạn Hoàn thành</DialogTitle>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-1">
            <Label>Hoàn thành hiện tại</Label>
            <p className="text-sm text-gray-500">
              {new Date(currentDeadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="newDate">Ngày gia hạn mới <span className="text-destructive">*</span></Label>
            <Input
              id="newDate"
              type="date"
              min={minDateStr}
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason">Lý do <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              placeholder="Giải thích lý do cần gia hạn..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-0">
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim() || !requestedDate}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white border-0"
          >
            {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

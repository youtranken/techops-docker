'use client';

import { useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ModalIcon = 'warning' | 'question';

interface ReasonModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  placeholder?: string;
  required?: boolean;
  confirmLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  icon?: ModalIcon;
}

export function ReasonModal({
  open, onClose, onConfirm, title,
  placeholder = 'Nhập lý do...',
  required = false,
  confirmLabel = 'Xác nhận',
  isDestructive = false,
  isLoading = false,
  icon,
}: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);

  function handleClose() { setReason(''); setAttempted(false); onClose(); }

  function handleConfirm() {
    if (required && !reason.trim()) { setAttempted(true); return; }
    onConfirm(reason.trim());
    setReason('');
    setAttempted(false);
  }

  const showError = attempted && required && !reason.trim();

  const heroBg    = isDestructive ? 'bg-red-50 dark:bg-red-950/30'     : 'bg-amber-50 dark:bg-amber-950/30';
  const circleBg  = isDestructive ? 'bg-red-100 dark:bg-red-900/50'    : 'bg-amber-100 dark:bg-amber-900/50';
  const iconColor = isDestructive ? 'text-red-600 dark:text-red-400'   : 'text-amber-600 dark:text-amber-400';
  const ring      = isDestructive ? 'ring-red-200/60 dark:ring-red-800/30' : 'ring-amber-200/60 dark:ring-amber-800/30';
  const btn       = isDestructive ? 'bg-red-600 hover:bg-red-700 text-white border-0' : 'bg-amber-600 hover:bg-amber-700 text-white border-0';
  const IconComp  = icon === 'warning' ? AlertTriangle : HelpCircle;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
        <div className={`${heroBg} pt-5 pb-3 px-6 text-center`}>
          {icon && (
            <div className={`w-12 h-12 rounded-full ${circleBg} flex items-center justify-center mx-auto mb-2 ring-4 ${ring}`}>
              <IconComp className={`h-6 w-6 ${iconColor}`} />
            </div>
          )}
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</DialogTitle>
        </div>
        <div className="px-6 py-4 space-y-2">
          <Label htmlFor="reason">
            Lý do {required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="reason"
            placeholder={placeholder}
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (attempted) setAttempted(false); }}
            rows={3}
            className={showError ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          {showError && <p className="text-xs text-red-500">Vui lòng nhập lý do</p>}
        </div>
        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-0">
          <Button onClick={handleConfirm} disabled={isLoading} className={`w-full ${btn}`}>
            {isLoading ? 'Đang xử lý...' : confirmLabel}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

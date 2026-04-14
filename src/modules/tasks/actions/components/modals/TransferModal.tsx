'use client';

import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAssignableUsers } from '../../../hooks/useAssignableUsers';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newAssigneeId: string, notes: string) => void;
  currentUserId: string;
  currentAssigneeIds: string[];
  isLoading?: boolean;
}

export function TransferModal({
  open, onClose, onConfirm, currentUserId, currentAssigneeIds, isLoading = false,
}: TransferModalProps) {
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [notes, setNotes] = useState('');
  const [attempted, setAttempted] = useState(false);
  const { data } = useAssignableUsers();
  const users = (data?.data ?? []).filter(
    (u) => u.id !== currentUserId && !currentAssigneeIds.includes(u.id),
  );

  function handleClose() {
    setNewAssigneeId('');
    setNotes('');
    setAttempted(false);
    onClose();
  }

  function handleConfirm() {
    if (!newAssigneeId || !notes.trim()) { setAttempted(true); return; }
    onConfirm(newAssigneeId, notes.trim());
  }

  const notesError = attempted && !notes.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
        <div className="bg-indigo-50 dark:bg-indigo-950/30 pt-5 pb-3 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mx-auto mb-2 ring-4 ring-indigo-200/60 dark:ring-indigo-800/30">
            <ArrowLeftRight className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">Chuyển giao công việc</DialogTitle>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-1">
            <Label>Người nhận <span className="text-destructive">*</span></Label>
            <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn người nhận..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Ghi chú chuyển giao <span className="text-destructive">*</span></Label>
            <Textarea
              id="notes"
              placeholder="Lý do chuyển giao..."
              value={notes}
              onChange={(e) => { setNotes(e.target.value); if (attempted) setAttempted(false); }}
              rows={3}
              className={notesError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {notesError && <p className="text-xs text-red-500">Vui lòng nhập ghi chú chuyển giao</p>}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-0">
          <Button onClick={handleConfirm} disabled={isLoading || !newAssigneeId} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0">
            {isLoading ? 'Đang xử lý...' : 'Chuyển giao'}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUsers } from '@/modules/hr/hooks/useUsers';

interface ReassignModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newAssigneeIds: string[]) => void;
  isLoading?: boolean;
}

export function ReassignModal({ open, onClose, onConfirm, isLoading = false }: ReassignModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const { data } = useUsers({ isActive: true });
  const users = data?.data ?? [];

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleClose() {
    setSelected([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
        <div className="bg-indigo-50 dark:bg-indigo-950/30 pt-5 pb-3 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mx-auto mb-2 ring-4 ring-indigo-200/60 dark:ring-indigo-800/30">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">Giao lại công việc</DialogTitle>
        </div>
        <div className="px-6 py-4 space-y-2">
          <Label>Chọn người thực hiện mới <span className="text-destructive">*</span></Label>
          <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700/50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} className="accent-primary" />
                <span className="text-sm">{u.displayName}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-gray-500">Đã chọn {selected.length} người</p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-0">
          <Button onClick={() => onConfirm(selected)} disabled={isLoading || selected.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0">
            {isLoading ? 'Đang xử lý...' : 'Giao lại'}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

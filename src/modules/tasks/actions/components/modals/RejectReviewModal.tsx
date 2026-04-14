'use client';

import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AssigneeRejectCard } from './AssigneeRejectCard';

export interface AssigneeOption {
  assigneeId: string;
  displayName: string;
  latestReport?: {
    content: string;
    attachments: { fileName: string; filePath: string; fileSize: number }[];
  };
}

export interface RejectReviewEntry {
  assigneeId: string | undefined;
  reason: string;
}

interface RejectReviewModalProps {
  open: boolean;
  onClose: () => void;
  completedAssignees: AssigneeOption[];
  isLoading?: boolean;
  onConfirm: (entries: RejectReviewEntry[]) => void;
}

export function RejectReviewModal({ open, onClose, completedAssignees, isLoading = false, onConfirm }: RejectReviewModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(completedAssignees.map((a) => a.assigneeId)));
      setReasons({});
      setAttempted(false);
    }
  }, [open, completedAssignees]);

  const allChecked = completedAssignees.length > 0 && completedAssignees.every((a) => selectedIds.has(a.assigneeId));
  const someChecked = completedAssignees.some((a) => selectedIds.has(a.assigneeId));
  const showSelectAll = completedAssignees.length > 1;

  function toggleAll() {
    setSelectedIds(allChecked ? new Set() : new Set(completedAssignees.map((a) => a.assigneeId)));
  }

  function toggleAssignee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function setReason(id: string, value: string) {
    setReasons((p) => ({ ...p, [id]: value }));
    if (attempted) setAttempted(false);
  }

  const selected = completedAssignees.filter((a) => selectedIds.has(a.assigneeId));
  const canSubmit = selected.length > 0 && selected.every((a) => (reasons[a.assigneeId] ?? '').trim().length > 0);

  function handleConfirm() {
    if (!canSubmit) { setAttempted(true); return; }
    onConfirm(selected.map((a) => ({ assigneeId: a.assigneeId, reason: (reasons[a.assigneeId] ?? '').trim() })));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
        <div className="bg-red-50 dark:bg-red-950/30 pt-5 pb-3 px-6 text-center shrink-0">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-2 ring-4 ring-red-200/60 dark:ring-red-800/30">
            <RotateCcw className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">Yêu cầu làm lại</DialogTitle>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {showSelectAll && (
            <div className="flex items-center gap-3 pb-1 border-b border-slate-100 dark:border-slate-700">
              <Checkbox
                checked={allChecked || (someChecked ? 'indeterminate' : false)}
                onCheckedChange={toggleAll}
                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              />
              <Label className="cursor-pointer text-sm font-medium" onClick={toggleAll}>
                Tất cả <span className="text-xs text-gray-500 font-normal">({completedAssignees.length} người)</span>
              </Label>
            </div>
          )}

          <div className="space-y-2">
            {completedAssignees.map((a) => (
              <AssigneeRejectCard
                key={a.assigneeId}
                assignee={a}
                checked={selectedIds.has(a.assigneeId)}
                reason={reasons[a.assigneeId] ?? ''}
                showError={attempted && selectedIds.has(a.assigneeId) && !(reasons[a.assigneeId] ?? '').trim()}
                onToggle={() => toggleAssignee(a.assigneeId)}
                onReasonChange={(v) => setReason(a.assigneeId, v)}
              />
            ))}
          </div>

          {attempted && selected.length === 0 && (
            <p className="text-sm text-red-500 text-center">Vui lòng chọn ít nhất một người</p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-2 shrink-0">
          <Button onClick={handleConfirm} disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white border-0">
            {isLoading ? 'Đang xử lý...' : 'Yêu cầu làm lại'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full">Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

/** Hộp xác nhận hành động (Duyệt, Nghiệm thu, Nhận việc, Khôi phục…) theo khung V2. Gọi `onConfirm()` như V1. */
import * as React from 'react';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';

interface ConfirmActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  /** Ghi chú "điều gì xảy ra tiếp theo" (`.note`) */
  note?: React.ReactNode;
  noteIcon?: React.ComponentType<{ className?: string }>;
  confirmLabel: string;
  danger?: boolean;
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
}

export function ConfirmActionModal({
  open, onClose, onConfirm, title, description, note, noteIcon, confirmLabel, danger, isLoading = false, task,
}: ConfirmActionModalProps) {
  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      task={task}
      okLabel={confirmLabel}
      onOk={onConfirm}
      danger={danger}
      pending={isLoading}
    >
      {description && <p>{description}</p>}
      {note && <DialogNote icon={noteIcon}>{note}</DialogNote>}
    </ActionDialog>
  );
}

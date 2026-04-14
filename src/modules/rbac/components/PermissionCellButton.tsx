'use client';

import { ShieldCheck, ShieldX } from 'lucide-react';

export type CellState = 'default' | 'GRANT' | 'REVOKE';

interface PermissionCellButtonProps {
  state: CellState;
  isDefault: boolean;  // role has this action by default
  isLocked: boolean;   // locked when task.isForceMode = true
  disabled: boolean;
  onClick: () => void;
}

/**
 * Single cell in the permissions matrix.
 * Cycles: default → GRANT → REVOKE → default on each click.
 */
export function PermissionCellButton({
  state,
  isDefault,
  isLocked,
  disabled,
  onClick,
}: PermissionCellButtonProps) {
  if (state === 'GRANT') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title="GRANT — click để chuyển sang REVOKE"
        className="h-6 w-6 mx-auto rounded bg-green-100 dark:bg-green-950/50 border border-green-300 flex items-center justify-center hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
      </button>
    );
  }

  if (state === 'REVOKE') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title="REVOKE — click để xoá override (về default)"
        className="h-6 w-6 mx-auto rounded bg-red-100 dark:bg-red-950/50 border border-red-300 flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShieldX className="h-3.5 w-3.5 text-red-500" />
      </button>
    );
  }

  // Default state — role has this action
  if (isDefault) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={`Quyền từ role${isLocked ? ' (khóa khi Force Mode)' : ''} — click để GRANT`}
        className="h-6 w-6 mx-auto rounded bg-muted border flex items-center justify-center hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative"
      >
        <div className="h-2 w-2 rounded-full bg-muted-foreground/40 group-hover:bg-muted-foreground/60 transition-colors" />
        {isLocked && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400"
            title="Khóa khi Force Mode"
          />
        )}
      </button>
    );
  }

  // No permission, no override
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Không có quyền — click để GRANT"
      className="h-6 w-6 mx-auto rounded border-2 border-dashed border-muted-foreground/20 flex items-center justify-center hover:border-muted-foreground/40 hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="sr-only">No permission</span>
    </button>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, ShieldX, Minus, Loader2 } from 'lucide-react';
import {
  useUserPermissionOverrides,
  useUpsertOverride,
  useDeleteOverride,
} from '@/modules/rbac/hooks/useUserPermissionOverrides';
import { useRoleActions } from '@/modules/rbac/hooks/useRoleActions';
import { PermissionCellButton, type CellState } from './PermissionCellButton';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  WORKFLOW_LABELS,
  WORKFLOW_ORDER,
  ACTION_GROUPS,
  ALL_ACTIONS,
} from '@/lib/constants';
import type { TaskStatus, WorkflowMode } from '@prisma/client';

interface PermissionsMatrixProps {
  userId: string;
}

export function PermissionsMatrix({ userId }: PermissionsMatrixProps) {
  const router = useRouter();

  const { data: roleData, isLoading: roleLoading } = useRoleActions(userId);
  const { data: overrides = [], isLoading: overridesLoading } = useUserPermissionOverrides(userId);
  const upsert = useUpsertOverride(userId);
  const remove = useDeleteOverride(userId);

  const isLoading = roleLoading || overridesLoading;
  const isMutating = upsert.isPending || remove.isPending;

  // Build role-default lookup sets
  const roleSet = new Set<string>();
  const forceLockSet = new Set<string>();
  if (roleData) {
    for (const ra of roleData.roleActions) {
      const key = `${ra.status}|${ra.workflowMode}|${ra.action}`;
      roleSet.add(key);
      if (ra.isForceModeLocked) forceLockSet.add(key);
    }
  }

  // Build override lookup map
  const overrideMap = new Map<string, 'GRANT' | 'REVOKE'>();
  for (const o of overrides) {
    overrideMap.set(`${o.status}|${o.workflowMode}|${o.action}`, o.override as 'GRANT' | 'REVOKE');
  }

  // Only show rows where the role has ≥1 action
  const visibleRows: { status: TaskStatus; workflow: WorkflowMode }[] = [];
  for (const status of STATUS_ORDER) {
    for (const workflow of WORKFLOW_ORDER) {
      const hasAny = ALL_ACTIONS.some((a) => roleSet.has(`${status}|${workflow}|${a}`));
      if (hasAny) visibleRows.push({ status, workflow });
    }
  }

  function getCellState(status: TaskStatus, workflow: WorkflowMode, action: string): CellState {
    return (overrideMap.get(`${status}|${workflow}|${action}`) as CellState | undefined) ?? 'default';
  }

  async function handleCellClick(status: TaskStatus, workflow: WorkflowMode, action: string) {
    const current = getCellState(status, workflow, action);
    const next: CellState =
      current === 'default' ? 'GRANT' : current === 'GRANT' ? 'REVOKE' : 'default';

    if (next === 'default') {
      try {
        await remove.mutateAsync({ userId, status, workflowMode: workflow, action });
      } catch {
        // ignore not-found — override may already be gone
      }
    } else {
      await upsert.mutateAsync({ userId, status, workflowMode: workflow, action, type: next });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Phân quyền</h1>
          {roleData && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{roleData.user.displayName}</span>
              {' '}({roleData.user.username}) —{' '}
              <Badge variant="outline" className="text-xs">
                {roleData.user.role.label}
              </Badge>
            </p>
          )}
        </div>
        {isMutating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang lưu...
          </div>
        )}
      </div>

      {/* Matrix table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 border-b border-r px-3 py-2 text-left font-medium min-w-[180px]">
                Trạng thái / Workflow
              </th>
              {ACTION_GROUPS.map((group) => (
                <th
                  key={group.label}
                  colSpan={group.actions.length}
                  className="border-b border-r px-2 py-2 text-center font-medium text-xs text-muted-foreground uppercase tracking-wide"
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr className="bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/30 border-b border-r px-3 py-1.5" />
              {ALL_ACTIONS.map((action) => {
                const isLastInGroup = ACTION_GROUPS.some(
                  (g) => g.actions[g.actions.length - 1] === action,
                );
                return (
                  <th
                    key={action}
                    className={`border-b px-1 py-1.5 text-center font-mono text-[10px] text-muted-foreground whitespace-nowrap ${isLastInGroup ? 'border-r' : ''}`}
                    style={{ minWidth: 52 }}
                  >
                    {action.replace(/_/g, '_\u200B')}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map(({ status, workflow }, rowIdx) => {
              const isFirstOfStatus = rowIdx === 0 || visibleRows[rowIdx - 1].status !== status;
              const isLastOfStatus =
                rowIdx === visibleRows.length - 1 || visibleRows[rowIdx + 1].status !== status;

              return (
                <tr
                  key={`${status}-${workflow}`}
                  className={`hover:bg-muted/20 ${isLastOfStatus ? 'border-b-2 border-muted' : 'border-b'}`}
                >
                  <td className="sticky left-0 z-10 bg-background border-r px-3 py-2 min-w-[180px]">
                    {isFirstOfStatus && (
                      <div className="font-medium text-xs text-foreground mb-0.5">
                        {STATUS_LABELS[status]}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">{WORKFLOW_LABELS[workflow]}</div>
                  </td>

                  {ALL_ACTIONS.map((action) => {
                    const isLastInGroup = ACTION_GROUPS.some(
                      (g) => g.actions[g.actions.length - 1] === action,
                    );
                    return (
                      <td
                        key={action}
                        className={`px-1 py-2 text-center ${isLastInGroup ? 'border-r' : ''}`}
                      >
                        <PermissionCellButton
                          state={getCellState(status, workflow, action)}
                          isDefault={roleSet.has(`${status}|${workflow}|${action}`)}
                          isLocked={forceLockSet.has(`${status}|${workflow}|${action}`)}
                          disabled={isMutating}
                          onClick={() => handleCellClick(status, workflow, action)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-xs text-muted-foreground px-1">
        <LegendItem icon={<Minus className="h-3 w-3 opacity-30" />} borderClass="border-2 border-dashed border-muted-foreground/30">
          Không có quyền (default)
        </LegendItem>
        <LegendItem icon={<div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />} bgClass="bg-muted border">
          Có quyền từ role
        </LegendItem>
        <LegendItem icon={<ShieldCheck className="h-3 w-3 text-green-600" />} bgClass="bg-green-100 dark:bg-green-950/50 border border-green-300">
          GRANT — mở thêm quyền
        </LegendItem>
        <LegendItem icon={<ShieldX className="h-3 w-3 text-red-500" />} bgClass="bg-red-100 dark:bg-red-950/50 border border-red-300">
          REVOKE — thu hồi quyền
        </LegendItem>
        <div className="flex items-center gap-2 ml-4 pl-4 border-l italic">
          Click ô: Default → GRANT → REVOKE → Default
        </div>
      </div>

      {/* Override summary */}
      {overrides.length > 0 && (
        <p className="text-xs text-muted-foreground px-1">
          Đang có{' '}
          <strong>{overrides.filter((o) => o.override === 'GRANT').length}</strong> GRANT và{' '}
          <strong>{overrides.filter((o) => o.override === 'REVOKE').length}</strong> REVOKE override.
        </p>
      )}
    </div>
  );
}

// ─── Legend item helper ───────────────────────────────────────────────────────

function LegendItem({
  icon,
  bgClass = '',
  borderClass = '',
  children,
}: {
  icon: React.ReactNode;
  bgClass?: string;
  borderClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-5 w-5 rounded flex items-center justify-center ${bgClass} ${borderClass}`}>
        {icon}
      </div>
      <span>{children}</span>
    </div>
  );
}

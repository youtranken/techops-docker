'use client';

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from '@/lib/constants';
import type { UserPermRow, MenuConfig } from '../types';

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[1][0] + words[words.length - 1][0]).toUpperCase();
}

interface Props {
  data: UserPermRow[];
  menus: MenuConfig[];
  isPending: boolean;
  onMenuToggle: (user: UserPermRow, menuKey: string, checked: boolean) => void;
  onFeatureToggle: (user: UserPermRow, menuKey: string, featureKey: string, checked: boolean) => void;
}

function isPrivileged(roleName: string) {
  return roleName === 'ADMIN' || roleName === 'BOSS';
}

export function PermissionsTable({ data, menus, isPending, onMenuToggle, onFeatureToggle }: Props) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-muted/50">
          <tr>
            <th rowSpan={2} className="text-left px-4 py-3 font-medium border-b border-r">Nhân viên</th>
            <th rowSpan={2} className="text-left px-4 py-3 font-medium border-b border-r">Username</th>
            <th rowSpan={2} className="text-left px-4 py-3 font-medium border-b border-r">Vai trò</th>
            {menus.map((m) => (
              <th key={m.key} colSpan={1 + m.features.length}
                className="text-center px-4 py-2 font-medium border-b border-r text-xs uppercase tracking-wide">
                {m.label}
              </th>
            ))}
          </tr>
          <tr>
            {menus.map((m) => (
              <React.Fragment key={m.key}>
                <th className="text-center px-3 py-2 font-normal text-xs text-muted-foreground border-b">Hiển thị</th>
                {m.features.map((f) => (
                  <th key={`${m.key}-${f.key}`} className="text-center px-3 py-2 font-normal text-xs text-muted-foreground border-b border-l">{f.label}</th>
                ))}
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((user) => {
            const privileged = isPrivileged(user.role.name);
            return (
              <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 border-r">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(user.displayName)}</AvatarFallback></Avatar>
                    <span className="font-medium">{user.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs border-r">{user.username}</td>
                <td className="px-4 py-3 border-r"><Badge variant={ROLE_BADGE_VARIANTS[user.role.name] ?? 'outline'}>{ROLE_LABELS[user.role.name] ?? user.role.name}</Badge></td>
                {menus.map((m) => {
                  const menuEnabled = privileged || user.visibleMenus.includes(m.key);
                  return (
                    <React.Fragment key={`${user.id}-${m.key}`}>
                      <td className="px-3 py-3 text-center">
                        <Checkbox checked={menuEnabled} disabled={privileged || isPending}
                          onCheckedChange={(c: boolean | 'indeterminate') => onMenuToggle(user, m.key, c === true)} />
                      </td>
                      {m.features.map((f) => {
                        const featureEnabled = privileged || (menuEnabled && (user.featurePermissions[m.key] ?? []).includes(f.key));
                        return (
                          <td key={`${m.key}-${f.key}`} className="px-3 py-3 text-center border-l">
                            <Checkbox checked={featureEnabled} disabled={privileged || !menuEnabled || isPending}
                              onCheckedChange={(c: boolean | 'indeterminate') => onFeatureToggle(user, m.key, f.key, c === true)} />
                          </td>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

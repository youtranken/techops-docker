'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Monitor, Smartphone, Tablet, Building2, Globe } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import type { UserLogEntry } from '../../types';
import { logDetailText } from './logDetailText';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Đăng nhập', LOGOUT: 'Đăng xuất',
  SESSION_TIMEOUT: 'Hết phiên', LOGIN_FAILED: 'Đăng nhập thất bại',
  VIEW_PAGE: 'Xem trang', EXPORT_DATA: 'Xuất dữ liệu',
  CREATE_USER: 'Tạo user', UPDATE_USER: 'Cập nhật user',
  DELETE_USER: 'Xoá user', RESET_PASSWORD: 'Đặt lại MK',
  CHANGE_SETTINGS: 'Đổi cài đặt',
};

const DEVICE_ICON = {
  Mobile: Smartphone, Tablet, Desktop: Monitor, Unknown: Monitor,
};

const ISP_COLORS: Record<string, string> = {
  Viettel: 'bg-red-100 text-red-700',
  VNPT:    'bg-blue-100 text-blue-700',
  FPT:     'bg-orange-100 text-orange-700',
};

const COUNTRY_FLAG: Record<string, string> = {
  Vietnam: '🇻🇳', 'United States': '🇺🇸', Singapore: '🇸🇬', Japan: '🇯🇵',
};

interface Props { log: UserLogEntry }

export function UserLogRow({ log }: Props) {
  const device = log.parsedDevice;
  const DeviceIcon = DEVICE_ICON[device?.deviceType ?? 'Unknown'];
  const ispColor = log.ispName
    ? Object.entries(ISP_COLORS).find(([k]) => log.ispName?.includes(k))?.[1]
      ?? 'bg-muted text-muted-foreground'
    : null;

  return (
    <TableRow className="hover:bg-muted/40 transition-colors">
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
      </TableCell>
      <TableCell>
        <p className="text-sm font-medium leading-none">{log.user.displayName}</p>
      </TableCell>
      <TableCell>
        <span className="text-sm text-foreground/80">
          {ACTION_LABELS[log.action] ?? log.action}
        </span>
      </TableCell>
      <TableCell className="max-w-[200px]">
        {logDetailText(log.metadata)
          ? <span className="text-xs text-muted-foreground">{logDetailText(log.metadata)}</span>
          : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>
        {device ? (
          <div className="flex items-center gap-1.5">
            <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium leading-none">
                {device.browser} {device.browserVersion}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{device.os}</p>
            </div>
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-muted-foreground">{log.ipAddress ?? '—'}</span>
          {log.ipType === 'internal' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground">
              <Building2 className="h-3 w-3" /> Nội bộ
            </span>
          )}
          {log.ipType === 'external' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-600">
              <Globe className="h-3 w-3" /> External
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {log.ispName && ispColor ? (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ispColor}`}>
            {log.ispName}
          </span>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {log.country ? `${COUNTRY_FLAG[log.country] ?? ''} ${log.country}`.trim() : '—'}
      </TableCell>
    </TableRow>
  );
}

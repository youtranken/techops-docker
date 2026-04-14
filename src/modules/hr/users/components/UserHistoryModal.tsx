'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, History } from 'lucide-react';
import { useUserHistory } from '../hooks/useUserHistory';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Đăng nhập', LOGOUT: 'Đăng xuất', SESSION_TIMEOUT: 'Hết phiên',
  LOGIN_FAILED: 'Đăng nhập thất bại', CREATE_USER: 'Tạo tài khoản',
  UPDATE_USER: 'Cập nhật thông tin', DELETE_USER: 'Xóa tài khoản',
  RESET_PASSWORD: 'Đặt lại mật khẩu', DEACTIVATE_USER: 'Vô hiệu hóa',
  ACTIVATE_USER: 'Kích hoạt lại', CHANGE_SETTINGS: 'Thay đổi cài đặt',
  EXPORT_DATA: 'Xuất dữ liệu', VIEW_PAGE: 'Xem trang',
};

interface Props { userId: string | null; displayName?: string; onClose: () => void; }

export function UserHistoryModal({ userId, displayName, onClose }: Props) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUserHistory({ userId, page });

  function handleOpenChange(open: boolean) { if (!open) { setPage(1); onClose(); } }

  return (
    <Dialog open={Boolean(userId)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Lịch sử hoạt động{displayName ? `: ${displayName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !data?.data.length ? (
            <p className="text-center text-sm text-muted-foreground py-8">Chưa có hoạt động nào</p>
          ) : (
            data.data.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm">
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="font-normal text-xs mb-1">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString('vi-VN')}
                    {entry.ipAddress && <> · {entry.ipAddress}</>}
                    {entry.city && <> · {entry.city}</>}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t text-sm text-muted-foreground shrink-0">
            <span>Trang {page}/{data.pagination.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Tiếp</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

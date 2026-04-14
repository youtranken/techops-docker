'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssignableUser { id: string; displayName: string; }

interface BulkAssignModalProps {
  selectedCount: number;
  open:          boolean;
  onClose:       () => void;
  onConfirm:     (assigneeId: string) => void;
  isSubmitting:  boolean;
}

export function BulkAssignModal({ selectedCount, open, onClose, onConfirm, isSubmitting }: BulkAssignModalProps) {
  const [users,          setUsers]          = useState<AssignableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingUsers,   setLoadingUsers]   = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedUserId('');
    setLoadingUsers(true);
    fetch('/api/tasks/assignable-users')
      .then((r) => r.json())
      .then((res: { data?: AssignableUser[] }) => { if (Array.isArray(res.data)) setUsers(res.data); })
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative z-10 w-full max-w-md bg-background rounded-2xl shadow-2xl p-6 space-y-5 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Gán hàng loạt</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
          </div>

          <p className="text-sm text-muted-foreground">
            Gán <span className="font-semibold text-foreground">{selectedCount}</span> ticket đã chọn cho cùng một người xử lý.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Người xử lý (IT Support)</label>
            {loadingUsers ? (
              <p className="text-sm text-muted-foreground animate-pulse">Đang tải...</p>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Chọn người xử lý --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
            <Button onClick={() => onConfirm(selectedUserId)} disabled={!selectedUserId || isSubmitting}>
              {isSubmitting ? 'Đang gán...' : `Gán ${selectedCount} ticket`}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

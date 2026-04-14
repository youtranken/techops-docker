'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePriorities, useCreatePriority, useUpdatePriority, useDeletePriority, type Priority } from '../hooks/usePriorities';
import { PriorityForm } from './PriorityForm';

export function PrioritiesSection() {
  const { data: priorities = [], isLoading } = usePriorities();
  const create = useCreatePriority();
  const update = useUpdatePriority();
  const remove = useDeletePriority();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Priority | null>(null);

  async function handleCreate(data: Omit<Priority, 'id' | '_count'>) {
    try {
      await create.mutateAsync(data);
      setShowCreate(false);
      toast.success('Đã thêm mức ưu tiên');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm');
    }
  }

  async function handleUpdate(data: Omit<Priority, 'id' | '_count'>) {
    if (!editing) return;
    try {
      await update.mutateAsync({ id: editing.id, data });
      setEditing(null);
      toast.success('Đã cập nhật');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật');
    }
  }

  async function handleDelete(p: Priority) {
    if (!confirm(`Xóa ưu tiên "${p.name}"?`)) return;
    try { await remove.mutateAsync(p.id); } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa — đang được sử dụng');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mức ưu tiên</h2>
          <p className="text-sm text-muted-foreground">Quản lý các cấp độ ưu tiên cho task</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Thêm
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Màu</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Mặc định</TableHead>
              <TableHead>Số task</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Đang tải...</TableCell></TableRow>
            ) : priorities.map((p) => (
              <TableRow key={p.id}>
                <TableCell><span className="inline-block w-5 h-5 rounded-full border" style={{ backgroundColor: p.color }} /></TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.level}</TableCell>
                <TableCell>{p.isDefault && <Badge variant="secondary">Mặc định</Badge>}</TableCell>
                <TableCell className="text-muted-foreground">{p._count?.tasks ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm mức ưu tiên</DialogTitle></DialogHeader>
          <PriorityForm onSave={handleCreate} onCancel={() => setShowCreate(false)} isPending={create.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chỉnh sửa: {editing?.name}</DialogTitle></DialogHeader>
          <PriorityForm initial={editing ?? {}} onSave={handleUpdate} onCancel={() => setEditing(null)} isPending={update.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

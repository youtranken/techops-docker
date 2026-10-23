'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useTaskTypes, useCreateTaskType, useUpdateTaskType, useDeleteTaskType, type TaskType } from '../hooks/useTaskTypes';
import { TaskTypeIcon } from './TaskTypeIcon';
import { TaskTypeForm } from './TaskTypeForm';

export function TaskTypesSection() {
  const { data: taskTypes = [], isLoading } = useTaskTypes();
  const create = useCreateTaskType();
  const update = useUpdateTaskType();
  const remove = useDeleteTaskType();
  const confirm = useConfirm();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TaskType | null>(null);

  async function handleCreate(data: Omit<TaskType, 'id' | '_count'>) {
    try {
      await create.mutateAsync({ ...data, description: data.description ?? undefined });
      setShowCreate(false);
      toast.success('Đã thêm loại công việc');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm');
    }
  }

  async function handleUpdate(data: Omit<TaskType, 'id' | '_count'>) {
    if (!editing) return;
    try {
      await update.mutateAsync({ id: editing.id, data: { ...data, description: data.description ?? undefined } });
      setEditing(null);
      toast.success('Đã cập nhật');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật');
    }
  }

  async function handleDelete(t: TaskType) {
    const ok = await confirm({
      title: `Xóa loại "${t.name}"?`,
      description: 'Thao tác này không hoàn tác được.',
      confirmText: 'Xóa',
      danger: true,
    });
    if (!ok) return;
    try { await remove.mutateAsync(t.id); } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa — đang được sử dụng');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Loại công việc</h2>
          <p className="text-sm text-muted-foreground">Phân loại các loại task theo danh mục</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Thêm
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Icon</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Số task</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Đang tải...</TableCell></TableRow>
            ) : taskTypes.map((t) => (
              <TableRow key={t.id}>
                <TableCell><TaskTypeIcon iconName={t.icon} /></TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{t.description ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{t._count?.tasks ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm loại công việc</DialogTitle></DialogHeader>
          <TaskTypeForm onSave={handleCreate} onCancel={() => setShowCreate(false)} isPending={create.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chỉnh sửa: {editing?.name}</DialogTitle></DialogHeader>
          <TaskTypeForm initial={editing ?? {}} onSave={handleUpdate} onCancel={() => setEditing(null)} isPending={update.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

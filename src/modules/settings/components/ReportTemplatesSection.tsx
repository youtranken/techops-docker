'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  useReportTemplates,
  useCreateReportTemplate,
  useUpdateReportTemplate,
  useDeleteReportTemplate,
  type ReportTemplate,
  type ReportTemplateInput,
} from '../hooks/useReportTemplates';
import { useTaskTypes } from '../hooks/useTaskTypes';

interface FormState {
  title: string;
  content: string;
  category: string;
  taskTypeId: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { title: '', content: '', category: '', taskTypeId: '', isActive: true };

function toFormState(t: ReportTemplate): FormState {
  return {
    title: t.title,
    content: t.content,
    category: t.category ?? '',
    taskTypeId: t.taskTypeId ?? '',
    isActive: t.isActive,
  };
}

function toInput(f: FormState): ReportTemplateInput {
  return {
    title: f.title.trim(),
    content: f.content.trim(),
    category: f.category.trim() || null,
    taskTypeId: f.taskTypeId || null,
    isActive: f.isActive,
  };
}

interface TemplateFormProps {
  initial?: FormState;
  isPending: boolean;
  onSave: (data: ReportTemplateInput) => void;
  onCancel: () => void;
}

function TemplateForm({ initial = EMPTY_FORM, isPending, onSave, onCancel }: TemplateFormProps) {
  const [form, setForm] = useState<FormState>(initial);
  const { data: taskTypes = [] } = useTaskTypes();
  const set = (key: keyof FormState, val: string | boolean) =>
    setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Tiêu đề <span className="text-destructive">*</span></Label>
        <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="vd: Báo cáo hoàn thành công trình" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Danh mục</Label>
          <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="vd: Kỹ thuật" />
        </div>
        <div className="space-y-1">
          <Label>Loại công việc</Label>
          <Select value={form.taskTypeId || '_all'} onValueChange={(v) => set('taskTypeId', v === '_all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Tất cả loại" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tất cả loại</SelectItem>
              {taskTypes.map((tt) => (
                <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Nội dung mẫu <span className="text-destructive">*</span></Label>
        <Textarea
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          rows={6}
          placeholder="Nhập nội dung mẫu báo cáo..."
          className="resize-none font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">{form.content.length}/5000 ký tự</p>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-primary" />
        Kích hoạt (hiển thị khi nhân viên báo cáo)
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button onClick={() => onSave(toInput(form))} disabled={isPending || !form.title.trim() || !form.content.trim()}>
          {isPending ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function ReportTemplatesSection() {
  const { data: templates = [], isLoading } = useReportTemplates();
  const { data: taskTypes = [] } = useTaskTypes();
  const create = useCreateReportTemplate();
  const update = useUpdateReportTemplate();
  const remove = useDeleteReportTemplate();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);

  const taskTypeMap = Object.fromEntries(taskTypes.map((t) => [t.id, t.name]));

  async function handleCreate(data: ReportTemplateInput) {
    try {
      await create.mutateAsync(data);
      setShowCreate(false);
      toast.success('Đã thêm mẫu báo cáo');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm');
    }
  }

  async function handleUpdate(data: ReportTemplateInput) {
    if (!editing) return;
    try {
      await update.mutateAsync({ id: editing.id, data });
      setEditing(null);
      toast.success('Đã cập nhật');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật');
    }
  }

  async function handleToggle(t: ReportTemplate) {
    try {
      await update.mutateAsync({ id: t.id, data: { isActive: !t.isActive } });
    } catch {
      toast.error('Không thể thay đổi trạng thái');
    }
  }

  async function handleDelete(t: ReportTemplate) {
    if (!confirm(`Xóa mẫu "${t.title}"?`)) return;
    try {
      await remove.mutateAsync(t.id);
      toast.success('Đã xóa');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mẫu hoàn thành</h2>
          <p className="text-sm text-muted-foreground">Quản lý mẫu nội dung báo cáo hoàn thành công việc</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Thêm mẫu
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Loại công việc</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Đang tải...</TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có mẫu báo cáo nào</TableCell>
              </TableRow>
            ) : templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{t.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{t.category ?? '—'}</TableCell>
                <TableCell className="text-sm">
                  {t.taskTypeId ? (
                    <Badge variant="outline">{taskTypeMap[t.taskTypeId] ?? t.taskTypeId}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Tất cả</span>
                  )}
                </TableCell>
                <TableCell>
                  <button onClick={() => handleToggle(t)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {t.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Thêm mẫu báo cáo</DialogTitle></DialogHeader>
          <TemplateForm onSave={handleCreate} onCancel={() => setShowCreate(false)} isPending={create.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chỉnh sửa: {editing?.title}</DialogTitle></DialogHeader>
          {editing && (
            <TemplateForm
              initial={toFormState(editing)}
              onSave={handleUpdate}
              onCancel={() => setEditing(null)}
              isPending={update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

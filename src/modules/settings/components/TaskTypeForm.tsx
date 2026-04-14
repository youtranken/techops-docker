'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { IconPicker } from './IconPicker';
import type { TaskType } from '../hooks/useTaskTypes';

interface Props {
  initial?: Partial<TaskType>;
  onSave: (data: Omit<TaskType, 'id' | '_count'>) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function TaskTypeForm({ initial, onSave, onCancel, isPending }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'Wrench');
  const [description, setDescription] = useState(initial?.description ?? '');

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Tên</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="vd: Phần mềm" />
      </div>
      <IconPicker value={icon} onChange={setIcon} />
      <div className="space-y-1">
        <Label>Mô tả (tùy chọn)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn..." />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button
          onClick={() => onSave({ name, icon, color: '#6B7280', description: description || undefined })}
          disabled={isPending || !name}
        >
          {isPending ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </DialogFooter>
    </div>
  );
}

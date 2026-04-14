'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import type { Priority } from '../hooks/usePriorities';

interface Props {
  initial?: Partial<Priority>;
  onSave: (data: Omit<Priority, 'id' | '_count'>) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function PriorityForm({ initial, onSave, onCancel, isPending }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#3B82F6');
  const [level, setLevel] = useState(initial?.level ?? 2);
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Tên</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="vd: Khẩn cấp" />
        </div>
        <div className="space-y-1">
          <Label>Màu</Label>
          <div className="flex gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded border cursor-pointer" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Level (1=Thấp → 4=Khẩn cấp)</Label>
          <Input type="number" min={1} max={10} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-primary" />
            Mặc định
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button onClick={() => onSave({ name, color, level, isDefault })} disabled={isPending || !name}>
          {isPending ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </DialogFooter>
    </div>
  );
}

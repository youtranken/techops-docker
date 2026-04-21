'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { useUpsertEmailTemplate } from '../hooks/useEmailTemplates';
import { toast } from 'sonner';
import type { EmailTemplate } from '../types';

interface Props {
  template: EmailTemplate & { isDefault?: boolean };
  onClose: () => void;
}

export function EmailTemplateEditor({ template, onClose }: Props) {
  const upsert = useUpsertEmailTemplate();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);

  useEffect(() => {
    setSubject(template.subject);
    setBody(template.body);
  }, [template]);

  async function handleSave() {
    try {
      await upsert.mutateAsync({ key: template.key, subject, body, isActive: template.isActive });
      toast.success('Đã lưu template');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu');
    }
  }

  return (
    <div className="space-y-4 p-4 rounded-xl border bg-muted/20">
      <div className="space-y-1.5">
        <Label className="text-xs">Tiêu đề (Subject)</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="[TechOps] Tiêu đề email..." />
        <p className="text-[11px] text-muted-foreground">
          Biến: {'{{taskTitle}}'}, {'{{userName}}'}, {'{{deadline}}'}, {'{{createdAt}}'}, {'{{taskUrl}}'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Nội dung (HTML)</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="<p>Nội dung email HTML...</p>"
        />
        <p className="text-[11px] text-muted-foreground">
          Hỗ trợ HTML. Biến dùng dấu {'{{}}'}
        </p>
      </div>

      {/* Preview */}
      {body && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Preview HTML</summary>
          <div className="mt-2 p-3 rounded-lg border bg-white dark:bg-gray-900 text-sm overflow-auto max-h-48"
            dangerouslySetInnerHTML={{ __html: body }} />
        </details>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
          {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Lưu template
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />Hủy
        </Button>
      </div>
    </div>
  );
}

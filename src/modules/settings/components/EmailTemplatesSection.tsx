'use client';

import { useState } from 'react';
import { Loader2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { NOTIFICATION_TYPES } from '../types';
import { cn } from '@/lib/utils';
import type { EmailTemplate } from '../types';

type TemplateWithMeta = EmailTemplate & { isDefault?: boolean };

export function EmailTemplatesSection() {
  const { data: templates = [], isLoading } = useEmailTemplates();
  const [editing, setEditing] = useState<TemplateWithMeta | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Mẫu nội dung email</h3>
        <p className="text-sm text-muted-foreground">Tùy chỉnh tiêu đề và nội dung HTML cho từng loại thông báo</p>
      </div>

      <div className="space-y-2">
        {templates.map((tpl) => {
          const info = NOTIFICATION_TYPES[tpl.key];
          const isOpen = editing?.key === tpl.key;

          return (
            <div key={tpl.key} className="rounded-xl border overflow-hidden">
              <button
                onClick={() => setEditing(isOpen ? null : tpl)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  isOpen ? 'bg-muted/50' : 'hover:bg-muted/30'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{info?.label ?? tpl.key}</p>
                    {tpl.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" />Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{tpl.subject}</p>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="border-t">
                  <EmailTemplateEditor template={tpl} onClose={() => setEditing(null)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

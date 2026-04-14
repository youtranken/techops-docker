'use client';

import { cn } from '@/lib/utils';
import { DIGEST_CONTENT_TYPES, type DigestContentType } from '../types';

interface Props {
  contentTypes: DigestContentType[];
  onChange: (types: DigestContentType[]) => void;
}

export function DigestContentFields({ contentTypes, onChange }: Props) {
  function toggle(key: DigestContentType) {
    onChange(
      contentTypes.includes(key)
        ? contentTypes.filter((t) => t !== key)
        : [...contentTypes, key],
    );
  }

  const allKeys = Object.keys(DIGEST_CONTENT_TYPES) as DigestContentType[];
  const allChecked = allKeys.every((k) => contentTypes.includes(k));

  function toggleAll() {
    onChange(allChecked ? [] : allKeys);
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2.5 cursor-pointer select-none py-1 border-b mb-3">
        <input type="checkbox" checked={allChecked} onChange={toggleAll}
          className="h-4 w-4 rounded accent-primary" />
        <span className="text-sm font-medium text-muted-foreground">Chọn tất cả</span>
      </label>

      {allKeys.map((key) => {
        const info = DIGEST_CONTENT_TYPES[key];
        const checked = contentTypes.includes(key);
        return (
          <label key={key} className={cn(
            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none',
            checked ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted/50',
          )}>
            <input type="checkbox" checked={checked} onChange={() => toggle(key)}
              className="mt-0.5 h-4 w-4 rounded accent-primary shrink-0" />
            <div>
              <p className="text-sm font-medium leading-none">{info.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

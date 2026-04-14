'use client';

import { FileText, X } from 'lucide-react';

interface AttachmentChipsProps {
  files: File[];
  onRemove: (index: number) => void;
  error: string | null;
}

export function AttachmentChips({ files, onRemove, error }: AttachmentChipsProps) {
  return (
    <>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pt-3">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 rounded-md px-2 py-1 max-w-[200px]">
              <FileText className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="truncate">{f.name}</span>
              <span className="text-slate-400 shrink-0">({(f.size / 1024 / 1024).toFixed(1)}MB)</span>
              <button type="button" onClick={() => onRemove(i)} className="shrink-0 ml-0.5 text-slate-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="px-5 pt-2 text-xs text-red-500">{error}</p>}
    </>
  );
}

'use client';

import { useRef, useState } from 'react';
import { Paperclip, X, Save, FileText, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePasteImage } from '@/modules/tasks/components/CreateTask/usePasteImage';
import { PasteImageModal } from '@/modules/tasks/components/CreateTask/PasteImageModal';

interface ExistingFile { id: string; fileName: string; fileSize: number }

interface EditTaskFooterProps {
  existingFiles: ExistingFile[];
  removedIds: string[];
  newFiles: File[];
  onRemoveExisting: (id: string) => void;
  onNewFilesChange: (files: File[]) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function EditTaskFooter({
  existingFiles, removedIds, newFiles,
  onRemoveExisting, onNewFilesChange,
  onCancel, onSubmit, isPending,
}: EditTaskFooterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pastedImage, setPastedImage] = useState<File | null>(null);

  // Listen clipboard paste image (Win+Shift+S → Ctrl+V workflow)
  usePasteImage(true, (img) => setPastedImage(img));

  function handlePasteConfirm(resized: File) {
    onNewFilesChange([...newFiles, resized]);
    setPastedImage(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    onNewFilesChange([...newFiles, ...selected]);
    e.target.value = '';
  }

  function removeNew(index: number) {
    onNewFilesChange(newFiles.filter((_, i) => i !== index));
  }

  const hasFiles = existingFiles.length > 0 || newFiles.length > 0;

  return (
    <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">

      {/* File list */}
      {hasFiles && (
        <div className="flex flex-wrap gap-1.5 px-5 pt-3">
          {/* Existing files */}
          {existingFiles.map((f) => {
            const removed = removedIds.includes(f.id);
            return (
              <span
                key={f.id}
                className={[
                  'flex items-center gap-1 text-[11px] rounded-md px-2 py-1 max-w-[200px]',
                  removed
                    ? 'bg-red-50 text-red-400 line-through opacity-60'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
                ].join(' ')}
              >
                <FileText className="w-3 h-3 shrink-0 text-slate-400" />
                <span className="truncate">{f.fileName}</span>
                <span className="shrink-0 text-slate-400 ml-0.5">{formatSize(f.fileSize)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveExisting(f.id)}
                  className="shrink-0 ml-0.5 text-slate-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {/* New files */}
          {newFiles.map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-1 text-[11px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md px-2 py-1 max-w-[200px]"
            >
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => removeNew(i)} className="shrink-0 ml-0.5 hover:text-indigo-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3">
        {/* Left: attach button + paste hint */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
            <span>Đính kèm</span>
            {newFiles.length > 0 && (
              <span className="text-[11px] bg-indigo-100 text-indigo-600 font-medium rounded-full px-1.5 py-0.5">
                +{newFiles.length}
              </span>
            )}
          </button>
          <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 border-l border-slate-200 pl-3">
            <ImagePlus className="w-3.5 h-3.5" />
            Tip: <kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Win</kbd>+<kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Shift</kbd>+<kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">S</kbd> rồi <kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Ctrl</kbd>+<kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">V</kbd>
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Right: actions */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel} type="button">Hủy</Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>

      <PasteImageModal
        file={pastedImage}
        onConfirm={handlePasteConfirm}
        onCancel={() => setPastedImage(null)}
      />
    </div>
  );
}

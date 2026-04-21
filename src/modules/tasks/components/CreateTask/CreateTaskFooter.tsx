'use client';

import { useRef, useState } from 'react';
import { Paperclip, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttachmentChips } from './AttachmentChips';
import { usePasteImage } from './usePasteImage';
import { PasteImageModal } from './PasteImageModal';

const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg':      'JPG',
  'image/jpg':       'JPG',
  'image/png':       'PNG',
};
const MAX_FILE_COUNT = 3;
const MAX_SIZE_MB = 10;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

interface CreateTaskFooterProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function CreateTaskFooter({
  files, onFilesChange, onCancel, onSubmit, isPending,
}: CreateTaskFooterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pastedImage, setPastedImage] = useState<File | null>(null);

  // Listen clipboard paste image (Win+Shift+S → Ctrl+V workflow)
  usePasteImage(true, (img) => {
    if (files.length >= MAX_FILE_COUNT) {
      setFileError(`Tối đa ${MAX_FILE_COUNT} file đính kèm`);
      return;
    }
    setFileError(null);
    setPastedImage(img);
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    setFileError(null);

    if (files.length + selected.length > MAX_FILE_COUNT) {
      setFileError(`Tối đa ${MAX_FILE_COUNT} file đính kèm`);
      return;
    }
    for (const f of selected) {
      if (!ACCEPTED_TYPES[f.type]) {
        setFileError(`"${f.name}" không hợp lệ — chỉ chấp nhận PDF, JPG, PNG`);
        return;
      }
      if (f.size > MAX_SIZE) {
        setFileError(`"${f.name}" vượt quá ${MAX_SIZE_MB}MB`);
        return;
      }
    }
    onFilesChange([...files, ...selected]);
  }

  function handlePasteConfirm(resized: File) {
    if (files.length >= MAX_FILE_COUNT) {
      setFileError(`Tối đa ${MAX_FILE_COUNT} file đính kèm`);
      setPastedImage(null);
      return;
    }
    onFilesChange([...files, resized]);
    setPastedImage(null);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
    setFileError(null);
  }

  return (
    <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <AttachmentChips files={files} onRemove={removeFile} error={fileError} />

      <div className="flex items-center justify-between px-5 py-3">
        {/* Left: attach + paste hint */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setFileError(null); fileInputRef.current?.click(); }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
            <span>Đính kèm</span>
            <span className="text-[11px] text-slate-400">PDF / JPG / PNG, tối đa {MAX_FILE_COUNT} file, {MAX_SIZE_MB}MB/file</span>
            {files.length > 0 && <span className="text-[11px] bg-indigo-100 text-indigo-600 font-medium rounded-full px-1.5 py-0.5">{files.length}</span>}
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isPending ? 'Đang tạo...' : 'Tạo công việc'}
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

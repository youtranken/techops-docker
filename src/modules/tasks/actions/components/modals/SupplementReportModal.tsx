'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, X, FileText, FilePlus2, ImagePlus } from 'lucide-react';
import { usePasteImage } from '@/modules/tasks/components/CreateTask/usePasteImage';
import { PasteImageModal } from '@/modules/tasks/components/CreateTask/PasteImageModal';
import {
  ACCEPTED_EXTENSIONS, ACCEPTED_LABEL, MAX_FILE_COUNT as MAX_FILES, MAX_SIZE_MB, validateNewAttachments,
} from '@/modules/tasks/components/CreateTask/attachment-rules';

interface FileEntry { fileName: string; filePath: string; fileSize: number; _file?: File }

interface Props {
  taskId?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (content: string, files: FileEntry[]) => void;
  isLoading?: boolean;
}


export function SupplementReportModal({ taskId, open, onClose, onConfirm, isLoading = false }: Props) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [fileError, setFileError] = useState('');
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  usePasteImage(open, (img) => {
    if (files.length >= MAX_FILES) { setFileError(`Tối đa ${MAX_FILES} file`); return; }
    setFileError(''); setPastedImage(img);
  });

  function handlePasteConfirm(file: File) {
    if (files.length >= MAX_FILES) { setFileError(`Tối đa ${MAX_FILES} file`); setPastedImage(null); return; }
    setFiles((prev) => [...prev, {
      fileName: file.name, filePath: `reports/${Date.now()}_${file.name}`, fileSize: file.size, _file: file,
    }]);
    setPastedImage(null);
  }

  useEffect(() => {
    if (open) { setContent(''); setFiles([]); setFileError(''); }
  }, [open]);

  function handleClose() {
    setContent(''); setFiles([]); setFileError(''); onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = '';
    const error = validateNewAttachments(selected, files.length);
    setFileError(error ?? '');
    if (error) return;
    setFiles((prev) => [
      ...prev,
      ...selected.map((f) => ({
        fileName: f.name, filePath: `reports/${Date.now()}_${f.name}`, fileSize: f.size, _file: f,
      })),
    ]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileError('');
  }

  function handleConfirm() {
    if (content.length < 10) return;
    onConfirm(content, files);
  }

  if (!taskId) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
        <div className="bg-amber-50 dark:bg-amber-950/30 pt-5 pb-3 px-6 text-center shrink-0">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto mb-2 ring-4 ring-amber-200/60 dark:ring-amber-800/30">
            <FilePlus2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-lg font-semibold">Bổ sung báo cáo</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Tạo phiên bản mới của báo cáo (giữ nguyên các bản trước)</p>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1">
            <Label htmlFor="supp-content">Nội dung bổ sung <span className="text-destructive">*</span></Label>
            <Textarea
              id="supp-content"
              placeholder="Mô tả phần bổ sung / cập nhật mới (ít nhất 10 ký tự)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
            {content.length > 0 && content.length < 10 && (
              <p className="text-xs text-destructive">Cần ít nhất 10 ký tự ({content.length}/10)</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>File đính kèm (tùy chọn — {ACCEPTED_LABEL}, tối đa {MAX_FILES} file, {MAX_SIZE_MB}MB/file)</Label>
            <div className="space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
                  <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="flex-1 truncate">{f.fileName}</span>
                  <span className="text-xs text-gray-500">{(f.fileSize / 1024).toFixed(0)}KB</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-gray-500 hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {files.length < MAX_FILES && (
              <div className="flex items-center gap-2 flex-wrap">
                <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS.join(',')} multiple className="hidden" onChange={handleFileChange} />
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                  <Paperclip className="h-4 w-4 mr-2" /> Đính kèm file
                </Button>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ImagePlus className="w-3.5 h-3.5" />
                  Tip: <kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Win</kbd>+<kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Shift</kbd>+<kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">S</kbd> rồi <kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">Ctrl</kbd>+<kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded">V</kbd>
                </span>
              </div>
            )}
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-2 shrink-0">
          <Button onClick={handleConfirm} disabled={isLoading || content.length < 10} className="w-full bg-amber-600 hover:bg-amber-700 text-white border-0">
            {isLoading ? 'Đang gửi...' : 'Gửi bổ sung'}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">Hủy</Button>
        </DialogFooter>

        <PasteImageModal file={pastedImage} onConfirm={handlePasteConfirm} onCancel={() => setPastedImage(null)} />
      </DialogContent>
    </Dialog>
  );
}

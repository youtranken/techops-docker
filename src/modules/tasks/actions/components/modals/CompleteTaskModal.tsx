'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, X, FileText, CheckCircle2 } from 'lucide-react';

interface FileEntry { fileName: string; filePath: string; fileSize: number; _file?: File }

interface CompleteTaskModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reportContent: string, files: FileEntry[]) => void;
  isLoading?: boolean;
}

const MAX_FILES = 3;
const MAX_SIZE = 10 * 1024 * 1024;

export function CompleteTaskModal({ open, onClose, onConfirm, isLoading = false }: CompleteTaskModalProps) {
  const [report, setReport] = useState('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setReport(''); setFiles([]); setFileError(''); }
  }, [open]);

  function handleClose() {
    setReport('');
    setFiles([]);
    setFileError('');
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFileError('');

    for (const f of selected) {
      if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
        setFileError('Chỉ chấp nhận PDF, JPG, PNG');
        return;
      }
      if (f.size > MAX_SIZE) {
        setFileError(`File ${f.name} vượt quá 10MB`);
        return;
      }
    }
    if (files.length + selected.length > MAX_FILES) {
      setFileError(`Tối đa ${MAX_FILES} file`);
      return;
    }

    const newEntries: FileEntry[] = selected.map((f) => ({
      fileName: f.name,
      filePath: `reports/${Date.now()}_${f.name}`,
      fileSize: f.size,
      _file: f,
    }));
    setFiles((prev) => [...prev, ...newEntries]);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileError('');
  }

  function handleConfirm() {
    if (report.length < 10) return;
    // Pass files WITH _file so hook can upload them
    onConfirm(report, files);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
        <div className="bg-green-50 dark:bg-green-950/30 pt-5 pb-3 px-6 text-center shrink-0">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-2 ring-4 ring-green-200/60 dark:ring-green-800/30">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">Báo cáo hoàn thành</DialogTitle>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1">
            <Label htmlFor="report">Nội dung báo cáo <span className="text-destructive">*</span></Label>
            <Textarea
              id="report"
              placeholder="Mô tả kết quả công việc đã thực hiện (ít nhất 10 ký tự)..."
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={5}
            />
            {report.length > 0 && report.length < 10 && (
              <p className="text-xs text-destructive">Cần ít nhất 10 ký tự ({report.length}/10)</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>File đính kèm (PDF / JPG / PNG, tối đa {MAX_FILES} file, 10MB/file)</Label>
            <div className="space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
                  <FileText className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="flex-1 truncate">{f.fileName}</span>
                  <span className="text-xs text-gray-500">{(f.fileSize / 1024).toFixed(0)}KB</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-gray-500 hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {files.length < MAX_FILES && (
              <>
                <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={handleFileChange} />
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                  <Paperclip className="h-4 w-4 mr-2" /> Đính kèm file
                </Button>
              </>
            )}
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-2 shrink-0">
          <Button onClick={handleConfirm} disabled={isLoading || report.length < 10} className="w-full bg-green-600 hover:bg-green-700 text-white border-0">
            {isLoading ? 'Đang gửi...' : 'Gửi báo cáo'}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

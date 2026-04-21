'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImagePlus } from 'lucide-react';

interface PasteImageModalProps {
  file: File | null;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

const MAX_SIZE_MB = 10;

/**
 * Modal preview image vừa paste, bấm "Thêm" để add vào danh sách Đính kèm.
 * Không resize — screenshot máy tính thường không vượt 10MB.
 */
export function PasteImageModal({ file, onConfirm, onCancel }: PasteImageModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setDimensions(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleConfirm() {
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Ảnh ${(file.size / 1024 / 1024).toFixed(1)}MB vượt giới hạn ${MAX_SIZE_MB}MB`);
      return;
    }
    onConfirm(file);
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5" />
            Thêm ảnh vào Đính kèm
          </DialogTitle>
        </DialogHeader>

        {previewUrl && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/40 p-3 max-h-[360px] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="paste preview" className="mx-auto max-h-[330px] object-contain" />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{dimensions ? `${dimensions.w} × ${dimensions.h}px` : '—'}</span>
              <span>{file ? `${(file.size / 1024).toFixed(0)}KB` : ''}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Hủy</Button>
          <Button onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Thêm vào Đính kèm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

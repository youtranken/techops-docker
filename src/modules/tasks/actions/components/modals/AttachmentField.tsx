'use client';

/**
 * Ô tệp đính kèm cho hộp Báo cáo / Bổ sung (preview `attField` + `wireAtt`: `.dropz .dz-rules .flist .fthumb`).
 * Luật tệp = V1 (`attachment-rules.ts`, qua `attachmentError`); dán ảnh Ctrl+V khi hộp đang mở (`usePasteImage` V1)
 * → hộp xem trước → thêm vào tệp. Tệp giữ dạng `FileEntry` V1 (`reports/<ts>_<tên>`, `_file`) để hook upload như cũ.
 */
import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Upload, FileText, X, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePasteImage } from '@/modules/tasks/components/CreateTask/usePasteImage';
import { ACCEPTED_EXTENSIONS, MAX_FILE_COUNT, MAX_SIZE_MB } from '@/modules/tasks/components/CreateTask/attachment-rules';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { attachmentError, fileSizeLabel, type Msg } from './action-dialog-rules';

export interface FileEntry { fileName: string; filePath: string; fileSize: number; _file?: File }

const toEntry = (f: File): FileEntry => ({ fileName: f.name, filePath: `reports/${Date.now()}_${f.name}`, fileSize: f.size, _file: f });

export function AttachmentField({ files, onChange, active }: { files: FileEntry[]; onChange: (f: FileEntry[]) => void; active: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [err, setErr] = React.useState<Msg | null>(null);
  const [hot, setHot] = React.useState(false);
  const [pasted, setPasted] = React.useState<File | null>(null);
  const full = files.length >= MAX_FILE_COUNT;

  React.useEffect(() => { if (!active) { setErr(null); setPasted(null); } }, [active]);

  function add(list: File[]) {
    const e = attachmentError(list, files.length, locale);
    setErr(e);
    if (e) return false;
    onChange([...files, ...list.map(toEntry)]);
    return true;
  }

  usePasteImage(active && !pasted, (img) => {
    if (files.length >= MAX_FILE_COUNT) { setErr({ key: 'tf.att.full', values: { n: MAX_FILE_COUNT } }); return; }
    setErr(null);
    setPasted(img);
  });

  return (
    <div className="mb-4 last:mb-0" data-field="att">
      <div className="flex items-baseline justify-between gap-2">
        <div id="att-lbl" className="mb-1.5 text-[13px] font-medium text-ink">
          {t('app.att.label')} <span className="font-normal text-ink-3">({t('app.opt')})</span>
        </div>
        <span className="font-mono text-xs text-ink-3">{t('tf.att.count', { x: files.length, n: MAX_FILE_COUNT })}</span>
      </div>
      <label
        className={cn(
          'flex cursor-pointer flex-wrap items-center justify-center gap-2 rounded-ctl border-[1.5px] border-dashed border-line-2 p-3.5 text-center text-[13px] text-ink-2',
          'hover:border-primary hover:bg-primary-soft focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
          hot && 'border-primary bg-primary-soft',
          full && 'cursor-not-allowed opacity-55 hover:border-line-2 hover:bg-transparent',
          err && 'border-danger',
        )}
        onDragEnter={(e) => { e.preventDefault(); if (!full) setHot(true); }}
        onDragOver={(e) => { e.preventDefault(); if (!full) setHot(true); }}
        onDragLeave={(e) => { e.preventDefault(); setHot(false); }}
        onDrop={(e) => {
          e.preventDefault(); setHot(false);
          const list = Array.from(e.dataTransfer?.files ?? []);
          if (list.length) add(list);
        }}
        onClick={(e) => { if (full) { e.preventDefault(); setErr({ key: 'tf.att.full', values: { n: MAX_FILE_COUNT } }); } }}
      >
        <Upload aria-hidden className="size-4" />
        <span>{t('app.att.drop')} <u className="font-medium text-primary-text no-underline">{t('app.att.pick')}</u></span>
        <small className="basis-full text-xs text-ink-3">{t('tf.att.rules', { n: MAX_FILE_COUNT, m: MAX_SIZE_MB })}</small>
        <input
          ref={inputRef}
          data-testid="att-input"
          type="file"
          multiple
          className="sr-only"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          disabled={full}
          aria-labelledby="att-lbl"
          aria-describedby="att-err att-tip"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (inputRef.current) inputRef.current.value = '';
            if (list.length) add(list);
          }}
        />
      </label>
      {err && (
        <p id="att-err" role="alert" className="m-0 mt-1.5 text-xs font-medium text-danger">{t(err.key, err.values)}</p>
      )}
      {files.length > 0 && (
        <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
          {files.map((f, i) => (
            <li key={`${f.filePath}-${i}`} className="flex min-w-0 items-center gap-2 rounded-ctl border border-line py-1 pl-2.5 pr-1 text-[13px]">
              <Thumb file={f._file} />
              <span className="min-w-0 flex-1 truncate text-ink" title={f.fileName}>{f.fileName}</span>
              <small className="flex-none font-mono text-xs text-ink-3">{fileSizeLabel(f.fileSize, locale)}</small>
              <button
                type="button"
                aria-label={t('app.att.remove', { f: f.fileName })}
                className="grid size-7 flex-none place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:size-10"
                onClick={() => { onChange(files.filter((_, j) => j !== i)); setErr(null); inputRef.current?.focus(); }}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p id="att-tip" className="m-0 mt-1.5 flex items-center gap-1.5 text-xs text-ink-3">
        <Camera aria-hidden className="size-3.5 flex-none" />{t('app.att.paste')}
      </p>

      <PastePreview
        file={pasted}
        onCancel={() => setPasted(null)}
        onConfirm={(file) => { add([file]); setPasted(null); }}
      />
    </div>
  );
}

function Thumb({ file }: { file?: File }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file || !/^image\//.test(file.type) || typeof URL.createObjectURL !== 'function') return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" className="size-7 flex-none rounded-[4px] border border-line object-cover" />;
  return <FileText aria-hidden className="size-4 flex-none text-ink-3" />;
}

/** Hộp xem trước ảnh vừa dán (thay PasteImageModal V1 trong hộp Báo cáo; CreateTask vẫn dùng bản V1 tới A2-5). */
function PastePreview({ file, onConfirm, onCancel }: { file: File | null; onConfirm: (f: File) => void; onCancel: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const [url, setUrl] = React.useState<string | null>(null);
  const [dim, setDim] = React.useState<string>('');
  React.useEffect(() => {
    if (!file) { setUrl(null); setDim(''); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    const img = new Image();
    img.onload = () => setDim(`${img.naturalWidth} × ${img.naturalHeight} px`);
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <ActionDialog
      open={!!file}
      onClose={onCancel}
      title={t('tf.paste.t')}
      okLabel={t('tf.paste.ok')}
      onOk={() => file && onConfirm(file)}
      data-testid="paste-preview"
    >
      {url && (
        <div className="grid max-h-[340px] place-items-center overflow-auto rounded-ctl bg-surface-2 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={t('tf.paste.alt')} className="block max-h-[310px] max-w-full" />
        </div>
      )}
      {file && (
        <p className="m-0 mt-1.5 text-xs text-ink-3">
          <span className="font-mono">{dim || '—'}</span> · <span className="font-mono">{fileSizeLabel(file.size, locale)}</span> · <span className="font-mono">{file.name}</span>
        </p>
      )}
    </ActionDialog>
  );
}

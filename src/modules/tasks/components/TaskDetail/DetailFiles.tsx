'use client';

/** Dòng tệp (preview `.file`): xem trực tiếp + tải về — đúng link V1 `/api/files?path=…`. */
import { useTranslations } from 'next-intl';
import { FileText, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileRow({ file }: { file: { fileName: string; filePath: string; fileSize: number } }) {
  const t = useTranslations();
  const url = `/api/files?path=${encodeURIComponent(file.filePath)}`;
  const Icon = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName) ? ImageIcon : FileText;
  const btn = 'grid size-[30px] flex-none place-items-center rounded-md text-ink-3 hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-ctl border border-line bg-surface-2 py-1.5 pl-3 pr-1.5">
      <Icon aria-hidden className="size-4 flex-none text-ink-3" />
      <a href={url} target="_blank" rel="noopener noreferrer" title={file.fileName}
        className="min-w-0 flex-1 truncate text-[13px] text-ink hover:text-primary-text hover:underline">
        {file.fileName}
      </a>
      <span className="whitespace-nowrap font-mono text-xs text-ink-3">{formatSize(file.fileSize)}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className={btn} aria-label={`${t('tdx.view')} ${file.fileName}`} title={t('tdx.view')}>
        <ExternalLink aria-hidden className="size-4" />
      </a>
      <a href={`${url}&dl=1`} download className={btn} aria-label={t('td.download', { f: file.fileName })} title={t('td.download', { f: file.fileName })}>
        <Download aria-hidden className="size-4" />
      </a>
    </div>
  );
}

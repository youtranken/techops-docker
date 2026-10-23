'use client';

/** Skeleton đúng hình trang chi tiết (preview `App.taskSkeleton`) + bản cho ngăn. */
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/shared/ui/States';

const card = 'min-w-0 rounded-card border border-line bg-surface shadow-v2-1';
function Blk({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div className={`${card} ${className ?? ''}`}>
      <div className="border-b border-line px-4 py-3.5"><Skeleton variant="line" className="h-3.5 w-[120px]" /></div>
      <div className="grid gap-3 px-4 py-4">{lines.map((w, i) => <Skeleton key={i} variant="line" style={{ width: w }} />)}</div>
    </div>
  );
}

export function TaskDetailSkeleton() {
  const t = useTranslations();
  return (
    <div aria-busy="true" data-testid="task-detail-skeleton">
      <span className="sr-only">{t('app.loading')}</span>
      <Skeleton className="mb-3 h-8 w-[84px] rounded-md" />
      <div className="mb-4 flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-[1_1_360px]">
          <Skeleton variant="line" className="h-3.5 w-[220px]" />
          <Skeleton className="mt-3 h-[26px] w-[min(560px,90%)]" />
          <Skeleton variant="line" className="mt-2.5 h-3.5 w-[240px]" />
        </div>
        <div className="flex gap-2 pt-6 max-[680px]:hidden">
          <Skeleton className="h-9 w-[84px] rounded-md" /><Skeleton className="h-9 w-[84px] rounded-md" /><Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
      <div className={`${card} mb-4 grid grid-cols-6 gap-px overflow-hidden bg-line max-[1100px]:grid-cols-3 max-[680px]:grid-cols-2`}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-surface px-4 py-3"><Skeleton variant="line" className="h-2.5 w-12" /><Skeleton variant="line" className="mt-2 h-3.5 w-4/5" /></div>
        ))}
      </div>
      <div className={`${card} mb-4 px-[18px] py-3`}>
        <Skeleton variant="line" className="h-3.5 w-[140px]" />
        <div className="mb-1 mt-3 flex justify-between">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="flex flex-col items-center gap-2"><Skeleton variant="circle" className="size-4" /><Skeleton variant="line" className="h-2.5 w-16" /></span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 min-[1200px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-4">
          <Blk lines={['100%', '96%', '88%', '70%']} />
          <Blk lines={['60%', '55%', '50%']} />
          <Blk lines={['100%', '92%', '60%']} />
        </div>
        <div className="grid min-w-0 gap-4">
          <Blk lines={['90%', '70%']} />
          <Blk lines={['60%', '80%', '50%']} />
        </div>
      </div>
    </div>
  );
}

/** Skeleton trong ngăn (nền canvas, các khối). */
export function DrawerSkeleton() {
  const t = useTranslations();
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">{t('app.loading')}</span>
      <Skeleton variant="line" className="h-3.5 w-24" />
      <Skeleton className="h-6 w-4/5" />
      <Blk lines={['90%', '80%', '70%', '60%']} />
      <Blk lines={['100%', '50%']} />
      <Blk lines={['100%', '92%', '60%']} />
    </div>
  );
}

'use client';

/** Đang tải: đúng hình trang (đầu trang, 6 ô chỉ số, 7 khối) — preview `skeleton()`. */
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/shared/ui/States';

const card = 'flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-v2-1';
const W = ['82%', '64%', '74%', '58%', '70%'];

function Hdr({ w }: { w: number }) {
  return <div className="px-4 pt-3.5"><Skeleton variant="line" style={{ width: w, height: 14 }} /><Skeleton variant="line" className="mt-2" style={{ width: 110, height: 10 }} /></div>;
}
function Rows({ n }: { n: number }) {
  return (
    <div className="py-1">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-t border-line px-4 py-3 first:border-t-0">
          <Skeleton variant="line" style={{ width: W[i % 5], height: 13 }} />
          <Skeleton variant="line" style={{ width: 54, height: 10 }} />
          <Skeleton variant="line" style={{ width: ['44%', '36%', '52%'][i % 3], height: 10 }} />
          <Skeleton variant="line" style={{ width: 36, height: 10 }} />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  const t = useTranslations();
  return (
    <div data-testid="db-skeleton">
      <div aria-hidden>
        <div className="mb-4"><Skeleton variant="line" style={{ width: 280, height: 24, maxWidth: '80%' }} /><Skeleton variant="line" className="mt-2.5" style={{ width: 360, height: 13, maxWidth: '90%' }} /></div>
        <section className="v2-db-kpis mb-4 grid gap-px overflow-hidden rounded-card border border-line bg-line">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-surface px-4 pb-4 pt-3.5">
              <Skeleton variant="line" style={{ width: 84, height: 10, maxWidth: '100%' }} />
              <Skeleton variant="line" className="mt-3" style={{ width: 56, height: 22 }} />
              <Skeleton variant="line" className="mt-2.5" style={{ width: '70%', height: 10 }} />
            </div>
          ))}
        </section>
        <div className="v2-db-grid">
          <section className={`${card} v2-db-act`}><Hdr w={120} /><Rows n={4} /></section>
          <section className={`${card} v2-db-due`}><Hdr w={110} /><Rows n={4} /></section>
          <section className={`${card} v2-db-cm`}><Hdr w={130} /><Rows n={4} /></section>
          <section className={`${card} v2-db-perf`}><Hdr w={90} /><div className="mx-4 mb-3.5 mt-4 h-[220px]"><Skeleton className="h-full w-full" /></div></section>
          <section className={`${card} v2-db-st`}><Hdr w={90} /><div className="space-y-3 px-4 pb-4 pt-4"><Skeleton variant="line" style={{ width: 140, height: 18 }} /><Skeleton variant="line" style={{ height: 10 }} />{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} variant="line" style={{ width: W[i % 5], height: 10 }} />)}</div></section>
          <section className={`${card} v2-db-pr`}><Hdr w={80} /><div className="space-y-3 px-4 pb-4 pt-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} variant="line" style={{ width: W[i % 5], height: 10 }} />)}</div></section>
          <section className={`${card} v2-db-rec`}><Hdr w={130} /><Rows n={5} /></section>
        </div>
      </div>
      <span className="sr-only" role="status">{t('db.loading')}</span>
    </div>
  );
}

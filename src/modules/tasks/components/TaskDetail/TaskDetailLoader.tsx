'use client';

/**
 * Trang `/tasks/[id]`: tải chi tiết + các trạng thái (preview task.html):
 * đang tải (skeleton đúng hình) · không tìm thấy (404) · không có quyền (403 → ForbiddenScreen A1-4) · lỗi mạng (Thử lại).
 * Lưu ý V1: API GET /api/tasks/[id] trả 404 cho cả "không tồn tại" lẫn "không có quyền" (không lộ việc) → màn 403 chỉ hiện
 * nếu API trả 403; chữ màn 404 nhắc cả hai khả năng.
 */
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FileQuestion, WifiOff, ArrowLeft, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForbiddenScreen } from '@/shared/ui/ErrorScreen';
import { useTaskDetail, TaskLoadError } from '../../hooks/useTaskDetail';
import { TaskDetailPage } from './TaskDetailPage';
import { TaskDetailSkeleton } from './TaskDetailSkeleton';

function StateScreen({ icon: Icon, title, desc, retry, bad }: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; title: string; desc: string; retry?: () => void; bad?: boolean;
}) {
  const t = useTranslations();
  return (
    <div role={bad ? 'alert' : 'status'} className="mx-auto flex min-h-[calc(100dvh-56px-120px)] max-w-[560px] flex-col items-center justify-center px-6 py-14 text-center max-sm:min-h-0 max-sm:px-2">
      <Icon aria-hidden className={bad ? 'mb-3 size-9 stroke-[1.5] text-danger' : 'mb-3 size-9 stroke-[1.5] text-ink-3'} />
      <h1 className="m-0 mb-2 font-head text-xl font-semibold leading-snug text-ink">{title}</h1>
      <p className="m-0 max-w-[440px] text-sm leading-relaxed text-ink-2">{desc}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {retry ? (
          <>
            <Button type="button" size="md" onClick={retry}><RotateCw aria-hidden />{t('app.retry')}</Button>
            <Button asChild variant="outline" size="md"><Link href="/tasks">{t('td.backList')}</Link></Button>
          </>
        ) : (
          <Button asChild size="md"><Link href="/tasks"><ArrowLeft aria-hidden />{t('td.backList')}</Link></Button>
        )}
      </div>
    </div>
  );
}

export function TaskDetailLoader({ id }: { id: string }) {
  const t = useTranslations();
  const { data: task, isLoading, error, refetch, isRefetching } = useTaskDetail(id);

  if (isLoading || (isRefetching && !task)) return <TaskDetailSkeleton />;
  if (task) return <TaskDetailPage task={task} />;

  const status = error instanceof TaskLoadError ? error.status : null;
  if (status === 403) return <ForbiddenScreen />;
  if (status === 404) return <StateScreen icon={FileQuestion} title={t('td.nf.t', { id })} desc={t('tdx.nf.d')} />;
  return <StateScreen icon={WifiOff} title={t('td.ne.t')} desc={t('td.ne.d')} retry={() => void refetch()} bad />;
}

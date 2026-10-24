'use client';

/**
 * Hàng 3 thẻ dưới cùng của Tổng quan (preview `.g3`):
 *  - Phân bố công việc: Trạng thái / Ưu tiên / Quy trình — cùng dữ liệu KPI V1 (`tasksByStatus`, `tasksByPriority`,
 *    `tasksByWorkflowMode`; V1 chỉ vẽ Quy trình). Số việc chế độ Bắt buộc = Phase B (V1 chưa có API cho trang).
 *  - Phễu xử lý: V1 `GET /api/analytics/funnel` (tỉ lệ do API tính).
 *  - Thời gian hoàn thành TB theo loại: V1 `GET /api/analytics/task-types`.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/shared/ui/States';
import { TASK_STATUS_META } from '@/shared/ui/status-meta';
import { useFormat } from '@/i18n/useFormat';
import type { KpiData, FunnelStage, TaskTypeTime } from '../../services/analytics.service';
import { RCard, Donut, Bars, Note, Muted, type Seg } from './parts';

const STATUS_ORDER = ['DRAFT', 'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'] as const;
type Dist = 'status' | 'priority' | 'flow';

export function DistCard({ kpi }: { kpi: KpiData }) {
  const t = useTranslations();
  const [dist, setDist] = React.useState<Dist>('status');
  const segs: Seg[] =
    dist === 'priority'
      ? kpi.tasksByPriority.map((p) => ({ key: p.name, label: p.name, value: p.count, color: p.color }))
      : dist === 'flow'
        ? [
            { key: 'IMMEDIATE', label: t('td.mode.direct'), value: kpi.tasksByWorkflowMode.IMMEDIATE, color: 'var(--c-pickup)' },
            { key: 'NEED_APPROVAL', label: t('td.mode.approval'), value: kpi.tasksByWorkflowMode.NEED_APPROVAL, color: 'var(--c-approval)' },
          ]
        : STATUS_ORDER.map((s) => ({ key: s, label: t(`st.${s}`), value: kpi.tasksByStatus[s] ?? 0, color: TASK_STATUS_META[s].color }));
  const has = segs.some((s) => s.value > 0);
  const title = t(`rp.d.${dist}`);
  return (
    <RCard id="rp-dT" title={t('rp.d.title')} testId="rp-dist">
      <div className="px-4 pt-3">
        <Segmented ariaLabel={t('rp.d.title')} value={dist} onChange={setDist} className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
          options={(['status', 'priority', 'flow'] as const).map((k) => ({ value: k, label: t(`rp.d.${k}`) }))} />
      </div>
      {has ? <Donut segs={segs} unit={t('rp.d.unit')} ariaLabel={t('rp.d.aria', { t: title })} testId="rp-dist-donut" /> : <Muted>{t('rp.empty._')}</Muted>}
    </RCard>
  );
}

const STAGE_KEY: Record<string, string> = { created: 'created', acknowledged: 'ack', in_progress: 'prog', pending_review: 'review', completed: 'done' };

export function FunnelCard({ data, loading }: { data: FunnelStage[]; loading: boolean }) {
  const t = useTranslations();
  const f = useFormat();
  const max = data[0]?.count ?? 0;
  return (
    <RCard id="rp-fT" title={t('rp.f.title')} testId="rp-funnel">
      {loading ? <CardSkel /> : max > 0 ? (
        <>
          <Bars rows={data.map((s) => ({
            key: s.stage,
            label: STAGE_KEY[s.stage] ? t(`rp.f.${STAGE_KEY[s.stage]}`) : s.label,
            value: f.number(s.count),
            pct: `${s.percentage}%`,
            ratio: s.count / max,
            color: s.stage === 'completed' ? 'var(--c-done)' : 'var(--primary)',
          }))} />
          <Note>{t('rp.f.note')}</Note>
        </>
      ) : <Muted>{t('rp.empty._')}</Muted>}
    </RCard>
  );
}

export function TypeTimeCard({ data, loading }: { data: TaskTypeTime[]; loading: boolean }) {
  const t = useTranslations();
  const f = useFormat();
  const max = data.reduce((m, x) => Math.max(m, x.avgDays), 0);
  return (
    <RCard id="rp-tT" title={t('rp.t.title')} testId="rp-types">
      {loading ? <CardSkel /> : data.length ? (
        <>
          <Bars rows={data.map((x) => ({
            key: x.typeId, label: x.name, small: t('rp.t.row', { n: f.number(x.taskCount) }),
            value: x.avgDays === 1 ? t('rp.day1') : t('rp.days', { n: f.number(x.avgDays) }),
            ratio: max ? x.avgDays / max : 0, color: 'var(--c-progress)',
          }))} />
          <Note>{t('rp.t.note')}</Note>
        </>
      ) : <Muted>{t('rp.empty._')}</Muted>}
    </RCard>
  );
}

function CardSkel() {
  return (
    <div className="grid gap-3.5 p-4">
      {[90, 70, 80, 60, 75].map((w) => <Skeleton key={w} variant="line" style={{ width: `${w}%` }} />)}
    </div>
  );
}

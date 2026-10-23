'use client';

/**
 * Phân bố việc TẠO TRONG THÁNG (V1 `tasksByStatus`, `tasksByPriority`, `tasksByWorkflowMode` — lọc createdAt ≥ đầu tháng).
 * V1 vẽ 3 biểu đồ tròn; V2 theo preview: thanh xếp chồng + chú giải (trạng thái), thanh ngang (ưu tiên) + quy trình.
 */
import * as React from 'react';
import { PieChart, Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { taskStatusMeta, priorityTone } from '@/shared/ui/status-meta';
import type { DashboardStats } from '../../services/stats/types';
import { statusDistribution, priorityBars, workflowSplit, type PriorityRef } from '../../view-model/dashboard-logic';
import { DashCard, CardEmpty } from '../parts/DashCard';

/** Màu thanh ưu tiên theo tông (preview `.p-*`); mức không rõ level → màu lưu trong DB. */
const PR_COLOR = { urgent: 'var(--danger)', high: 'var(--c-review)', normal: 'var(--c-progress)', low: 'var(--c-draft)' } as const;
const WF_COLOR = { direct: 'var(--c-pickup)', approval: 'var(--c-approval)' } as const;

function Stack({ parts, label }: { parts: { key: string; n: number; color: string }[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex h-2.5 gap-0.5 overflow-hidden rounded-pill bg-surface-2">
      {parts.filter((p) => p.n > 0).map((p) => (
        <i key={p.key} className="block h-full min-w-[3px]" style={{ flex: `${p.n} 1 0`, background: p.color }} />
      ))}
    </div>
  );
}

function Legend({ rows }: { rows: { key: string; label: string; n: number; pct: number; color: string }[] }) {
  return (
    <ul className="m-0 mt-3 grid list-none gap-0.5 p-0">
      {rows.map((r) => (
        <li key={r.key} data-key={r.key} className={`grid min-h-[26px] grid-cols-[8px_minmax(0,1fr)_auto_44px] items-center gap-2 text-[13px] ${r.n ? 'text-ink-2' : 'text-ink-3'}`}>
          <span aria-hidden className={`size-2 rounded-full ${r.n ? '' : 'opacity-45'}`} style={{ background: r.color }} />
          <span className="truncate">{r.label}</span>
          <span className={`text-right font-mono text-[13px] font-medium ${r.n ? 'text-ink' : 'text-ink-3'}`} data-n>{r.n}</span>
          <span className="text-right font-mono text-xs text-ink-3">{r.pct}%</span>
        </li>
      ))}
    </ul>
  );
}

export function StatusCard({ data, month }: { data: DashboardStats['tasksByStatus']; month: string }) {
  const t = useTranslations();
  const d = statusDistribution(data);
  const rows = d.rows.map((r) => ({ key: r.status, label: t(`st.${r.status}`), n: r.count, pct: r.pct, color: taskStatusMeta(r.status).color }));
  return (
    <DashCard id="db-st" className="v2-db-st" title={t('filter.status')} sub={t('db.dist.sub', { m: month })}>
      {!d.total ? <CardEmpty icon={PieChart} text={t('db.dist.empty')} /> : (
        <div className="flex flex-1 flex-col px-4 pb-4 pt-3 max-[680px]:px-3.5">
          <div className="mb-3 flex items-baseline gap-2 text-[13px] text-ink-2">
            <b className="font-head text-[22px] font-semibold leading-none text-ink tabular-nums" data-testid="db-st-total">{d.total}</b>
            <span>{t('db.dist.total', { m: month })}</span>
          </div>
          <Stack parts={rows.map((r) => ({ key: r.key, n: r.n, color: r.color }))} label={rows.filter((r) => r.n).map((r) => `${r.label} ${r.n}`).join(', ')} />
          <Legend rows={rows} />
        </div>
      )}
    </DashCard>
  );
}

export function PriorityCard({ data, flow, priorities, month }: {
  data: DashboardStats['tasksByPriority']; flow: DashboardStats['tasksByWorkflowMode']; priorities?: PriorityRef[]; month: string;
}) {
  const t = useTranslations();
  const p = priorityBars(data, priorities);
  const w = workflowSplit(flow);
  const wfRows = [
    { key: 'direct', label: t('td.mode.direct'), n: w.direct, pct: w.directPct, color: WF_COLOR.direct },
    { key: 'approval', label: t('td.mode.approval'), n: w.approval, pct: w.approvalPct, color: WF_COLOR.approval },
  ];
  return (
    <DashCard id="db-pr" className="v2-db-pr" title={t('filter.priority')} sub={t('db.dist.sub', { m: month })}>
      {!p.total ? <CardEmpty icon={Flag} text={t('db.dist.empty')} /> : (
        <div className="flex flex-1 flex-col px-4 pb-4 pt-3 max-[680px]:px-3.5">
          <div className="grid gap-2.5">
            {p.rows.map((r) => (
              <div key={r.id} data-key={r.name} className="grid grid-cols-[minmax(64px,auto)_minmax(0,1fr)_32px] items-center gap-2.5 text-[13px] text-ink-2">
                <span className="truncate">{r.name}</span>
                <span role="presentation" className="h-2 overflow-hidden rounded-pill bg-surface-2">
                  <i className="block h-full rounded-[inherit]" style={{ width: `${r.width}%`, background: r.level === null ? r.color ?? 'var(--ink-3)' : PR_COLOR[priorityTone(r.level)] }} />
                </span>
                <span className="text-right font-mono text-[13px] font-medium text-ink" data-n>{r.count}</span>
              </div>
            ))}
          </div>
          <div className="mb-2.5 mt-[18px] border-t border-line pt-3.5 font-head text-[13px] font-semibold text-ink">{t('db.wf.t')}</div>
          <Stack parts={wfRows.map((r) => ({ key: r.key, n: r.n, color: r.color }))} label={wfRows.map((r) => `${r.label} ${r.n}`).join(', ')} />
          <Legend rows={wfRows} />
        </div>
      )}
    </DashCard>
  );
}

'use client';

/**
 * Báo cáo · Danh sách công việc V2 (A3-5) — preview `reports-tasks.html`. Nghiệp vụ V1 `/analytics/task-list` giữ nguyên:
 * URL trang (`dateFrom`, `dateTo`, `preset`, `userId`, `search`, `sortBy`, `sortOrder`, `page`, `pageSize`), API danh sách/
 * nhân viên/Xuất Excel cùng tham số (`taskListApiUrl`, `taskListExcelHref`), PDF chụp `#task-list-content` như V1.
 * Nhãn kỳ của tệp (`period`) theo kiểu kỳ đang hiện (link không có `preset` + khoảng quý → tên theo ngày, không ghi nhầm "Thang-…").
 * Sửa lỗi giao diện V1: mở trang (vd từ Hiệu suất theo người) không còn bị đặt lại về tháng hiện tại.
 * Lọc theo trạng thái = Phase B (API V1 không có) → dải tóm tắt chỉ hiện số.
 */
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/shared/ui/Pagination';
import { controlClass } from '@/shared/ui/Field';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import { useTaskList, useTaskListEmployees } from '../../hooks/useAnalytics';
import { useExportPdf } from '../../hooks/useExportPdf';
import {
  todayISO, parseTaskList, taskListUpdate, taskListExcelHref, tlDisplayPreset, tlRange, monthRange, monthOptions, yearOptions, yearOf,
  inferPeriod, TL_SORTS, type TlPreset, type Range,
} from '../../view/report-logic';
import { ReportHead } from './ReportHead';
import { PeriodBar, usePeriodLabel, selectCls } from './period';
import { TlTable } from './TlTable';
import { Dot } from './parts';

const CONTENT_ID = 'task-list-content';

export function TaskListReport({ onOpenTask }: { onOpenTask: (id: string, ids: string[]) => void }) {
  const t = useTranslations();
  const f = useFormat();
  const router = useRouter();
  const sp = useSearchParams();
  const today = React.useMemo(() => todayISO(), []);
  const s = parseTaskList(sp, today);
  const shown = tlDisplayPreset(s);
  const label = usePeriodLabel();
  const go = (u: Record<string, string>) => router.replace(`?${taskListUpdate(new URLSearchParams(sp.toString()), u)}`, { scroll: false });
  const setRange = (preset: TlPreset, r: Range) => go({ dateFrom: r.dateFrom, dateTo: r.dateTo, preset, page: '1' });

  const employees = useTaskListEmployees();
  const q = useTaskList({
    dateFrom: s.range.dateFrom || undefined, dateTo: s.range.dateTo || undefined, userId: s.userId || undefined,
    search: s.search || undefined, sortBy: s.sortBy, sortOrder: s.sortOrder, page: s.page, pageSize: s.pageSize,
  });
  const { exportPdf, isExporting } = useExportPdf();

  // ô tìm: gõ xong 400ms hoặc Enter → `search` + về trang 1 (V1: Enter)
  const [qText, setQText] = React.useState(s.search);
  React.useEffect(() => setQText(s.search), [s.search]);
  React.useEffect(() => {
    if (qText === s.search) return;
    const id = setTimeout(() => go({ search: qText.trim() ? qText : '', page: '1' }), 400);
    return () => clearTimeout(id);
  }, [qText]); // eslint-disable-line react-hooks/exhaustive-deps

  const period = inferPeriod(s.range);
  const yearSel = period.kind === 'month' || period.kind === 'year' ? period.y : yearOf(s.range.dateFrom || today);
  const onPreset = (p: TlPreset) => {
    if (p === 'custom') return go({ preset: 'custom' });
    if (p === 'year') return setRange('year', tlRange(0, yearSel).range);
    const cur = period.kind === 'month' ? period : null;
    setRange('month', cur ? monthRange(cur.y, cur.m) : tlRange(Number(today.slice(5, 7)), yearOf(today)).range);
  };
  const picker = shown === 'year'
    ? { value: String(yearSel), options: yearOptions(today).map((y) => ({ value: String(y), label: label({ kind: 'year', y }) })),
        onChange: (v: string) => setRange('year', tlRange(0, Number(v)).range) }
    : { value: period.kind === 'month' ? `${period.y}-${period.m}` : '', options: monthOptions(today).map((o) => ({ value: `${o.y}-${o.m}`, label: label({ kind: 'month', ...o }) })),
        onChange: (v: string) => { const [y, m] = v.split('-').map(Number); setRange('month', monthRange(y, m)); } };

  const emp = employees.data ?? [];
  const who = emp.find((e) => e.id === s.userId)?.displayName ?? t('rp.l.all');
  const data = q.data;
  const kpi = data?.kpi;

  const actions = (
    <>
      <Button variant="outline" size="md" asChild className="max-[680px]:h-11">
        <a href={taskListExcelHref({ ...s, preset: shown })} download data-testid="rp-xlsx"><Download aria-hidden />{t('rp.exportXlsx')}</a>
      </Button>
      <Button size="md" disabled={isExporting || q.isLoading} aria-busy={isExporting || undefined} className="max-[680px]:h-11" data-testid="rp-pdf"
        onClick={() => void exportPdf(CONTENT_ID, { dateFrom: s.range.dateFrom, dateTo: s.range.dateTo }, shown)}>
        {isExporting ? <><Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" />{t('rp.exporting')}</> : <><Download aria-hidden />{t('rp.exportPdf')}</>}
      </Button>
    </>
  );

  const sums = kpi ? [
    { k: 'total', l: t('rp.l.s.total'), c: 'var(--ink-3)', v: kpi.total },
    { k: 'done', l: t('rp.p.done'), c: 'var(--c-done)', v: kpi.completed },
    { k: 'prog', l: t('rp.p.prog'), c: 'var(--c-progress)', v: kpi.inProgress },
    { k: 'over', l: t('rp.p.over'), c: 'var(--danger)', v: kpi.overdue },
    { k: 'rej', l: t('rp.p.rej'), c: 'var(--danger)', v: kpi.rejected },
    { k: 'trans', l: t('rp.p.trans'), c: 'var(--ink-3)', v: kpi.transferred },
  ] : [];

  return (
    <div>
      <ReportHead sub={t('rp.l.sub', { p: label(period), u: who, n: data ? f.number(data.total) : '…' })} actions={actions} />
      <PeriodBar<TlPreset>
        presets={[{ value: 'month', label: t('rp.pr.month') }, { value: 'year', label: t('rp.pr.year') }, { value: 'custom', label: t('rp.pr.custom') }]}
        preset={shown} onPreset={onPreset} customValue="custom" picker={picker}
        range={s.range} onRange={(r) => setRange('custom', r)} today={today}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <label className="sr-only" htmlFor="rp-user">{t('filter.assignee')}</label>
        <select id="rp-user" className={selectCls} value={s.userId} onChange={(e) => go({ userId: e.target.value, page: '1' })} data-testid="rp-user">
          <option value="">{t('rp.l.all')}</option>
          {emp.map((e) => <option key={e.id} value={e.id}>{e.displayName}</option>)}
        </select>
        <label className="relative w-60 max-[680px]:w-full">
          <span className="sr-only">{t('rp.l.search')}</span>
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input type="search" value={qText} placeholder={t('rp.l.search')} data-testid="rp-search"
            onChange={(e) => setQText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go({ search: qText, page: '1' }); }}
            className={cn(controlClass, 'h-[34px] pl-8 text-[13px] max-[680px]:h-11')} />
        </label>
        <span className="hidden max-[680px]:flex max-[680px]:w-full">
          <label className="sr-only" htmlFor="rp-sort">{t('rp.l.sort._')}</label>
          <select id="rp-sort" className={selectCls} value={`${s.sortBy}-${s.sortOrder}`}
            onChange={(e) => { const [by, ord] = e.target.value.split('-'); go({ sortBy: by, sortOrder: ord, page: '1' }); }}>
            {TL_SORTS.map((o) => <option key={o.v} value={o.v}>{t(o.k)}</option>)}
          </select>
        </span>
      </div>

      <div id={CONTENT_ID}>
        {kpi && (
          <ul className="m-0 mb-1.5 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-[13px] text-ink-2" aria-label={t('filter.status')} data-testid="rp-tl-sum">
            {sums.map((x) => (
              <li key={x.k} className="inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap" data-sum={x.k}>
                <Dot color={x.c} className="size-[7px]" />{x.l} <b className="font-head text-sm font-semibold text-ink tabular-nums">{f.number(x.v)}</b>
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 mb-3 text-xs text-ink-3">{t('rp.l.note')}</p>
        <TlTable s={s} rows={data?.rows ?? []} loading={q.isLoading} error={q.isError} onRetry={() => void q.refetch()}
          noneInPeriod={!!kpi && kpi.total === 0 && !s.search && !s.userId}
          onSort={(by, ord) => go({ sortBy: by, sortOrder: ord, page: '1' })} onOpenTask={onOpenTask} />
        {data && data.total > 0 && (
          <Pagination page={s.page} pageSize={s.pageSize} total={data.total} onPageChange={(p) => go({ page: String(p) })}
            onPageSizeChange={(n) => go({ pageSize: String(n), page: '1' })} />
        )}
      </div>
    </div>
  );
}

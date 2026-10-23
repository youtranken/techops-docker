'use client';

/** Các khối có khung dùng chung cho trang + ngăn chi tiết (preview `.blk`). */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, FileText, Users, Paperclip, Headset, Info, AlertTriangle, XCircle, Copy } from 'lucide-react';
import { Block } from '@/shared/ui/Block';
import { StatusDot } from '@/shared/ui/StatusDot';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import type { TaskDetail } from '../../services/task-query.service';
import { assigneeNote, reportProgress } from './detail-logic';
import { FileRow } from './DetailFiles';
import { ReportDialog, fmtDateTime, ver } from './ReportDialog';
import { AuditLogEntry } from './AuditLogEntry';
import { copyTaskCode } from './DetailActions';
import type { TaskDetailModel } from './useTaskDetailModel';

const COLLAPSED_PX = 288;
export const proseCls = cn(
  'text-sm leading-relaxed text-ink [overflow-wrap:anywhere]',
  '[&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline [&_a]:text-primary-text [&_a]:underline',
  '[&_ul]:my-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:my-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_p]:mb-1.5 [&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:font-semibold',
);

/** Mô tả: giới hạn ~288px + Xem toàn bộ / Thu gọn (quyết định đã chốt; HTML V1 hiển thị như V1). */
export function DescriptionBlock({ html, clamp = true, className }: { html: string; clamp?: boolean; className?: string }) {
  const t = useTranslations();
  const ref = React.useRef<HTMLDivElement>(null);
  const [over, setOver] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el) setOver(el.scrollHeight > COLLAPSED_PX + 4);
    setOpen(false);
  }, [html]);
  const id = React.useId();
  return (
    <Block title={t('td.desc')} icon={FileText} className={className}>
      {html ? (
        <div
          id={id}
          ref={ref}
          className={cn(proseCls, clamp && !open && 'max-h-72 overflow-hidden', clamp && over && !open && '[mask-image:linear-gradient(to_bottom,#000_80%,transparent)]')}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="m-0 text-[13px] text-ink-3">{t('td.descEmpty')}</p>
      )}
      {clamp && over && (
        <button
          type="button"
          aria-controls={id}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="-ml-1.5 mt-2.5 inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-[13px] font-medium text-primary-text hover:bg-primary-soft"
        >
          <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')} />
          {t(open ? 'td.less' : 'td.more')}
        </button>
      )}
    </Block>
  );
}

/** Kết quả của người làm: mỗi người 1 dòng, phiên bản báo cáo mới nhất, nút Xem báo cáo (popup chọn phiên bản). */
export function ResultsBlock({ model, className }: { model: TaskDetailModel; className?: string }) {
  const t = useTranslations();
  const f = useFormat();
  const { task } = model;
  const [view, setView] = React.useState<TaskDetail['assignees'][number] | null>(null);
  const p = reportProgress(task);
  return (
    <Block id="results" title={t('td.results')} icon={Users} aux={t('dnd.reported', { x: p.x, n: p.n })} flush className={className}>
      <ul className="m-0 list-none p-0" data-testid="results">
        {task.assignees.map((a) => {
          const r = a.reports[a.reports.length - 1];
          const note = assigneeNote(task, a);
          const me = a.user.id === model.viewerId;
          const sub = !note ? null
            : note.kind === 'declined' ? <><span className="text-ink-3">{t('td.declineWhy')}:</span> {note.text}</>
            : note.kind === 'rework' ? <><span className="text-ink-3">{t('td.reworkWhy')}:</span> {note.text}</>
            : note.kind === 'to' ? t('td.toPerson', { a: note.name })
            : note.kind === 'from' ? <span className="text-ink-3">{t('td.fromPerson', { a: note.name })}</span>
            : <span className="text-ink-3">{t('td.byCancel')}</span>;
          return (
            <li key={a.id} data-assignee={a.user.username}
              className={cn(
                'grid items-center gap-x-3.5 border-b border-line px-4 py-3 last:border-b-0',
                'grid-cols-[32px_minmax(0,1fr)_44px_104px_auto] [grid-template-areas:"av_who_ver_time_act"_"._sub_sub_sub_sub"]',
                'max-[680px]:grid-cols-[32px_auto_minmax(0,1fr)_auto] max-[680px]:gap-y-1 max-[680px]:px-3.5 max-[680px]:[grid-template-areas:"av_who_who_who"_"._ver_time_act"_"._sub_sub_sub"]',
                me && 'bg-[color-mix(in_srgb,var(--primary-soft)_35%,var(--surface))]',
              )}>
              <span className="[grid-area:av]">
                <UserAvatar displayName={a.user.displayName} avatarUrl={a.user.profile?.avatarUrl} avatarColor={a.user.profile?.avatarColor} size="md" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5 [grid-area:who]">
                <b className="truncate text-sm font-semibold text-ink">
                  {a.user.displayName}{me && <span className="font-normal text-ink-3"> ({t('td.you')})</span>}
                </b>
                <StatusDot kind="assignee" status={a.status} className="text-xs" />
              </div>
              <span className="font-mono text-xs text-ink-2 [grid-area:ver]">{r ? ver(r) : ''}</span>
              <span className="whitespace-nowrap text-xs text-ink-3 [grid-area:time]">{r ? fmtDateTime(r.submittedAt, f.locale) : ''}</span>
              <span className="flex items-center justify-end gap-1 [grid-area:act]">
                {r ? (
                  <Button type="button" variant="outline" size="xs" onClick={() => setView(a)}>
                    <FileText aria-hidden />{t('td.viewReport')}
                  </Button>
                ) : a.status !== 'REJECTED' && a.status !== 'TRANSFERRED' ? (
                  <span className="text-xs text-ink-3">{t('td.noReport')}</span>
                ) : null}
              </span>
              {sub && <p className="m-0 mt-2 text-[13px] text-ink-2 [grid-area:sub] [overflow-wrap:anywhere]">{sub}</p>}
            </li>
          );
        })}
      </ul>
      <ReportDialog assignee={view} taskCode={task.taskCode ?? ''} taskTitle={task.title} onClose={() => setView(null)} />
    </Block>
  );
}

/** Tệp đính kèm: xem/tải như V1. Nút "+ Thêm tệp" của V1 không có chức năng → không hiện (xem báo cáo A2-1). */
export function FilesBlock({ task, className }: { task: TaskDetail; className?: string }) {
  const t = useTranslations();
  return (
    <Block title={t('td.files')} icon={Paperclip} count={task.attachments.length || undefined} className={className}>
      {task.attachments.length ? (
        <div className="grid gap-2">{task.attachments.map((x) => <FileRow key={x.id} file={x} />)}</div>
      ) : (
        <p className="m-0 text-[13px] text-ink-3">{t('td.noFiles')}</p>
      )}
    </Block>
  );
}

const Kv1 = ({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) => (
  <dl className="m-0 grid gap-2.5">
    {rows.map(([k, v], i) => (
      <div key={i} className="grid grid-cols-[104px_minmax(0,1fr)] items-baseline gap-3">
        <dt className="text-xs text-ink-3">{k}</dt>
        <dd className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-ink [overflow-wrap:anywhere]">{v}</dd>
      </div>
    ))}
  </dl>
);

/** Nguồn Helpdesk — chỉ việc nhập từ Helpdesk (V1 chỉ hiện mã phiếu, không có link mở phiếu). */
export function HelpdeskBlock({ task, className }: { task: TaskDetail; className?: string }) {
  const t = useTranslations();
  if (task.hdNguonNhap !== 'helpdesk' || !task.hdCode) return null;
  const rows: [React.ReactNode, React.ReactNode][] = [[t('td.ticket'), <span key="c" className="font-mono">HD-{task.hdCode}</span>]];
  if (task.hdNhanVien) rows.push([t('td.requester'), task.hdNhanVien]);
  if (task.hdPhongBan) rows.push([t('tdx.dept'), task.hdPhongBan]);
  return <Block title={t('td.source')} icon={Headset} className={className}><Kv1 rows={rows} /></Block>;
}

export function ExtraBlock({ task, className }: { task: TaskDetail; className?: string }) {
  const t = useTranslations();
  const f = useFormat();
  const code = task.taskCode ?? task.id;
  const rows: [React.ReactNode, React.ReactNode][] = [
    [t('td.taskId'), <>
      <span className="font-mono">{code}</span>
      <button type="button" onClick={() => copyTaskCode(code, t)} aria-label={t('qa.copy')} title={t('qa.copy')}
        className="-my-1 grid size-6 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">
        <Copy aria-hidden className="size-3.5" />
      </button>
    </>],
    [t('td.created'), <span key="c" className="font-mono">{f.date(task.createdAt)}</span>],
  ];
  if (task.scheduleStart) rows.push([t('tdx.start'), <span key="s" className="font-mono">{f.date(task.scheduleStart)}</span>]);
  if (task.completedAt) rows.push([t('tdx.doneAt'), <span key="d" className="font-mono text-c-done">{f.date(task.completedAt)}</span>]);
  rows.push([t('td.mode._'), <>{t(task.workflowMode === 'IMMEDIATE' ? 'td.mode.direct' : 'td.mode.approval')}{task.isForceMode ? ` · ${t('td.force')}` : ''}</>]);
  return <Block title={t('td.extra')} icon={Info} className={className}><Kv1 rows={rows} /></Block>;
}

/** Banner "mọi người đã từ chối" — chữ theo quyền V1 (Giao lại chỉ Admin; người tạo được Hủy). */
export function AllFailedBanner({ model, className }: { model: TaskDetailModel; className?: string }) {
  const t = useTranslations();
  const { permissions: P, task } = model;
  if (model.holder.kind !== 'allFailed') return null;
  const n = task.assignees.filter((a) => a.status === 'REJECTED').length;
  const k = P.canReassign ? 'td.af.admin' : P.canCancel && P.isCreator ? 'td.af.creator' : P.isBoss ? 'td.af.boss' : 'td.af.other';
  return (
    <div role="status" className={cn('flex flex-wrap items-center gap-2.5 rounded-ctl bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3.5 py-3 text-[13px]', className)}>
      <AlertTriangle aria-hidden className="size-4 flex-none text-danger" />
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
        <b className="font-semibold text-ink">{t('td.af.t')}</b>
        <span className="text-ink-2">{t(k, { n, a: task.creator.displayName })}</span>
      </div>
      {!P.canReassign && P.canCancel && P.isCreator && (
        <Button type="button" variant="neg" size="xs" onClick={() => model.panel.setModal('cancel')}>
          <XCircle aria-hidden />{t('act.cancel')}
        </Button>
      )}
    </div>
  );
}

/** Lý do hủy / từ chối kế hoạch (lấy từ nhật ký V1). */
export function CancelNote({ model, className }: { model: TaskDetailModel; className?: string }) {
  const t = useTranslations();
  const f = useFormat();
  const c = model.cancel;
  if (!c) return null;
  return (
    <p className={cn('m-0 flex items-start gap-2 rounded-ctl bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))] px-3 py-2.5 text-[13px] text-ink-2', className)}>
      <XCircle aria-hidden className="mt-0.5 size-4 flex-none text-danger" />
      <span>
        <b className="font-semibold text-ink">{t(c.plan ? 'td.rejectReason' : 'td.cancelReason')}:</b>{' '}
        {c.reason ?? t('td.noReason')}
        {(c.byName || c.at) && <span className="text-ink-3"> — {[c.byName, c.at ? fmtDateTime(c.at, f.locale) : null].filter(Boolean).join(', ')}</span>}
      </span>
    </p>
  );
}

const HIDDEN_ACTIONS = new Set(['COMMENT_ADDED']);
export function HistoryPanel({ task }: { task: TaskDetail }) {
  const t = useTranslations();
  const logs = task.auditLogs.filter((l) => !HIDDEN_ACTIONS.has(l.action));
  if (!logs.length) return <p className="m-0 py-2 text-[13px] text-ink-3">{t('td.hist.empty')}</p>;
  return <ol className="m-0 list-none p-0">{logs.map((l) => <AuditLogEntry key={l.id} log={l} assignees={task.assignees} />)}</ol>;
}
export const historyCount = (task: TaskDetail) => task.auditLogs.filter((l) => !HIDDEN_ACTIONS.has(l.action)).length;

'use client';

/**
 * Ngăn chi tiết một dòng nhật ký (preview logs.html `drTask` / `drUser` / `drRef`). Mới ở V2 — V1 không có ngăn,
 * nhưng chỉ hiện dữ liệu dòng đã tải về (không gọi API thêm). Chân ngăn: liên kết "Mở công việc" (/tasks/[id]) và
 * "Xem nhật ký việc này" (lọc nhật ký công việc theo tiêu đề — tham số `taskTitle` của V1).
 * Phase B (không hiện): nội dung bình luận, tiến độ "x/n người đã báo cáo", lọc theo IP.
 */
import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ExternalLink, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/shared/ui/StatusDot';
import { useFormat } from '@/i18n/useFormat';
import type { TaskLogEntry, TaskRefEntry, UserLogEntry } from '../../types';
import { fullDateTime, taskActionKey, taskChanges, taskGroup, userActionKey, userDetail, userGroup, type Msg } from '../../view/log-logic';
import { ActionMark, CopyBtn, Person, UnknownPerson, useMsg } from './LogParts';

const iconBtn = 'grid size-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Shell<T>({ item, title, onClose, children, footer, testId }: {
  item: T | null; title: string; onClose: () => void; children: (it: T) => React.ReactNode; footer?: (it: T) => React.ReactNode; testId: string;
}) {
  const t = useTranslations();
  const [shown, setShown] = React.useState(item);
  React.useEffect(() => { if (item) setShown(item); }, [item]);
  const it = item ?? shown;
  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" aria-describedby={undefined} data-testid={testId}
        className="v2-drawer flex w-full flex-col gap-0 border-0 bg-surface p-0 sm:max-w-[520px] max-[680px]:max-w-none">
        <header className="flex h-14 flex-none items-center gap-1 border-b border-line pl-4 pr-3 max-[680px]:pl-3 max-[680px]:pr-2">
          <button type="button" onClick={onClose} className="-ml-1.5 hidden h-11 items-center gap-1 rounded-md pl-1 pr-2.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-[680px]:inline-flex">
            <ChevronLeft aria-hidden className="size-5" />{t('td.back')}
          </button>
          <SheetTitle className="m-0 ml-1 min-w-0 flex-1 truncate font-head text-[15px] font-semibold text-ink max-[680px]:text-sm">{title}</SheetTitle>
          <button type="button" onClick={onClose} className={`${iconBtn} max-[680px]:hidden`} aria-label={t('app.close')}>
            <X aria-hidden className="size-5" />
          </button>
        </header>
        {it && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-5 max-[680px]:px-4">{children(it)}</div>
            {footer && (
              <footer className="flex flex-none flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 max-[680px]:pb-[max(12px,env(safe-area-inset-bottom))]">
                {footer(it)}
              </footer>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Danh sách nhãn/giá trị 1 cột (preview `dl.kv1`) */
function Kv({ rows }: { rows: ([string, React.ReactNode] | null | false)[] }) {
  return (
    <dl className="m-0 grid gap-y-2.5">
      {rows.filter(Boolean).map((r) => {
        const [k, v] = r as [string, React.ReactNode];
        return (
          <div key={k} className="grid grid-cols-[116px_minmax(0,1fr)] items-baseline gap-x-3 text-sm max-[680px]:grid-cols-[96px_minmax(0,1fr)]">
            <dt className="text-ink-3">{k}</dt>
            <dd className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ink [overflow-wrap:anywhere]">{v}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="m-0 mb-2 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}
function Quote({ children }: { children: React.ReactNode }) {
  return <blockquote className="m-0 rounded-r-ctl border-l-[3px] border-line-2 bg-surface-2 px-3 py-2.5 text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">{children}</blockquote>;
}
function EventId({ id }: { id: string }) {
  const t = useTranslations();
  return (
    <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-xs text-ink-3">
      <span>{t('lg.dr.evId')}</span><span className="font-mono text-ink-2 [overflow-wrap:anywhere]">{id}</span><CopyBtn value={id} />
    </div>
  );
}

function MsgCell({ m }: { m: Msg | null }) {
  const render = useMsg();
  if (!m) return <span className="text-ink-3">—</span>;
  if ('status' in m) return <StatusDot status={m.status} className="whitespace-normal text-sm text-inherit" />;
  if ('date' in m) return <span className="font-mono text-[13px]">{render(m)}</span>;
  return <>{render(m)}</>;
}

function ChangeTable({ rows }: { rows: { field: Msg; old: Msg | null; new: Msg | null }[] }) {
  const t = useTranslations();
  const render = useMsg();
  if (!rows.length) return null;
  return (
    <Section title={t('lg.dr.changes')}>
      <table className="w-full table-fixed border-collapse text-sm" data-testid="lg-dr-changes">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th scope="col" className="w-[30%] pb-1.5 pr-2.5 font-medium">{t('lg.dr.field')}</th>
            <th scope="col" className="pb-1.5 pr-2.5 font-medium">{t('lg.dr.old')}</th>
            <th scope="col" className="pb-1.5 font-medium">{t('lg.dr.new')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line align-top">
              <td className="py-2 pr-2.5 text-ink-2 [overflow-wrap:anywhere]">{render(r.field)}</td>
              <td className="py-2 pr-2.5 text-ink-3 [overflow-wrap:anywhere]"><MsgCell m={r.old} /></td>
              <td className="py-2 text-ink [overflow-wrap:anywhere]"><MsgCell m={r.new} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function TaskHead({ code, title, id }: { code: string | null; title: string; id: string | null }) {
  return (
    <h3 className="m-0 mt-2 font-head text-lg font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
      {code && (id
        ? <Link href={`/tasks/${id}`} className="mr-1.5 font-mono text-sm font-medium text-primary-text hover:underline">{code}</Link>
        : <span className="mr-1.5 font-mono text-sm font-medium text-ink-2">{code}</span>)}
      {title}
    </h3>
  );
}

/* ---------- Sự kiện công việc ---------- */
export function TaskEventDrawer({ log, nameOf, onClose, onTaskLog }: {
  log: TaskLogEntry | null; nameOf: (id: string) => string | undefined; onClose: () => void; onTaskLog?: (title: string) => void;
}) {
  const t = useTranslations();
  const f = useFormat();
  const render = useMsg();
  return (
    <Shell item={log} title={t('lg.dr.task')} onClose={onClose} testId="lg-drawer"
      footer={(l) => l.task && (
        <>
          {onTaskLog && <Button type="button" variant="outline" size="md" className="max-[680px]:h-11" onClick={() => onTaskLog(l.task!.title)} data-testid="lg-dr-tasklog">{t('lg.dr.taskLog')}</Button>}
          <Button asChild size="md" className="max-[680px]:h-11">
            <Link href={`/tasks/${l.task.id}`} data-testid="lg-dr-open"><ExternalLink aria-hidden />{t('lg.dr.openTask')}</Link>
          </Button>
        </>
      )}>
      {(l) => {
        const ch = taskChanges(l, nameOf);
        const key = taskActionKey(l);
        const role = l.performedBy.role?.name;
        const empty = !ch.rows.length && !ch.reasons.length && !ch.note;
        return (
          <>
            <ActionMark group={taskGroup(l.action)} label={key ? t(key as never) : l.action} />
            {l.task
              ? <TaskHead code={l.task.taskCode} title={l.task.title} id={l.task.id} />
              : <p className="m-0 mt-2 text-sm text-ink-3">{t('lg.dr.noTask')}</p>}
            <div className="mt-[18px]">
              <Kv rows={[
                [t('lg.dr.when'), <span key="w" className="font-mono text-[13px]">{fullDateTime(l.createdAt, f.locale)}</span>],
                [t('lg.dr.who'), <Person key="p" name={l.performedBy.displayName} size="xs" sub={role ? <small className="text-xs text-ink-3">{t.has(`ppx.role.${role}` as never) ? t(`ppx.role.${role}` as never) : role}</small> : undefined} />],
                ch.sameStatus && l.newStatus ? [t('lg.dr.status'), <span key="s" className="flex items-center gap-1.5"><StatusDot status={l.newStatus} className="text-sm text-ink" /><span className="text-xs text-ink-3">· {t('lg.dr.same')}</span></span>] : null,
                l.task ? [t('lg.col.id'), <span key="i" className="flex min-w-0 items-center gap-0.5"><span className="font-mono text-[13px] [overflow-wrap:anywhere]">{l.task.id}</span><CopyBtn value={l.task.id} /></span>] : null,
              ]} />
            </div>
            {ch.reasons.length > 0 && (
              <Section title={t('lg.dr.reason')}>
                <div className="grid gap-2">{ch.reasons.map((r, i) => <Quote key={i}>{r}</Quote>)}</div>
              </Section>
            )}
            <ChangeTable rows={ch.rows} />
            {ch.note && <Section title={t('lg.dr.note')}><Quote>{ch.note}</Quote></Section>}
            {l.action === 'COMMENT_ADDED' && <p className="m-0 mt-6 text-[13px] text-ink-3">{ch.summary.map(render).join(' · ')}{ch.summary.length ? ' · ' : ''}{t('lgx.dr.cmPB')}</p>}
            {empty && l.action !== 'COMMENT_ADDED' && <p className="m-0 mt-6 text-[13px] text-ink-3">{ch.summary.length ? ch.summary.map(render).join(' · ') : t('lg.chg.none')}</p>}
            <EventId id={l.id} />
          </>
        );
      }}
    </Shell>
  );
}

/* ---------- Sự kiện người dùng ---------- */
const DEVICE_ICON = { Mobile: Smartphone, Tablet, Desktop: Monitor, Unknown: Monitor } as const;

export function UserEventDrawer({ log, onClose }: { log: UserLogEntry | null; onClose: () => void }) {
  const t = useTranslations();
  const f = useFormat();
  const render = useMsg();
  return (
    <Shell item={log} title={t('lg.dr.user')} onClose={onClose} testId="lg-drawer">
      {(l) => {
        const key = userActionKey(l.action);
        const detail = userDetail(l.metadata);
        const dev = l.parsedDevice;
        const DevIcon = DEVICE_ICON[dev?.deviceType ?? 'Unknown'];
        const tried = typeof l.metadata?.attemptedUsername === 'string' ? l.metadata.attemptedUsername : undefined;
        const loc = [l.city, l.country].filter(Boolean).join(', ');
        return (
          <>
            <ActionMark group={userGroup(l.action)} label={key ? t(key as never) : l.action} className="text-base" />
            <div className="mt-[18px]">
              <Kv rows={[
                [t('lg.dr.when'), <span key="w" className="font-mono text-[13px]">{fullDateTime(l.createdAt, f.locale)}</span>],
                [t('lg.dr.who'), l.user
                  ? <Person key="p" name={l.user.displayName} size="xs" sub={<small className="font-mono text-[11px] text-ink-3">{l.user.username}</small>} />
                  : <UnknownPerson key="u" tried={tried} />],
                detail ? [t('lg.dr.result'), render(detail)] : null,
                [t('lg.dr.ip'), <span key="ip" className="flex flex-wrap items-center gap-2"><span className="font-mono text-[13px]">{l.ipAddress ?? '—'}</span><IpKind kind={l.ipType} /></span>],
                l.ispName ? [t('lg.dr.isp'), l.ispName] : null,
                loc ? [t('lg.dr.loc'), loc] : null,
                [t('lg.dr.device'), dev
                  ? <span key="d" className="flex items-center gap-1.5"><DevIcon aria-hidden className="size-4 text-ink-3" />{`${dev.browser} ${dev.browserVersion} · ${dev.os}${dev.deviceType !== 'Unknown' ? ` · ${t(`lg.dev.${dev.deviceType}` as never)}` : ''}`}</span>
                  : <span key="d" className="font-mono text-[13px]">{l.userAgent ?? '—'}</span>],
              ]} />
            </div>
            {l.userAgent && dev && (
              <section className="mt-6">
                <details>
                  <summary className="w-max max-w-full cursor-pointer rounded text-sm text-ink-2 hover:text-ink">{t('lg.dr.ua')}</summary>
                  <p className="m-0 mt-2 font-mono text-xs leading-relaxed text-ink-3 [overflow-wrap:anywhere]">{l.userAgent}</p>
                </details>
              </section>
            )}
            <EventId id={l.id} />
          </>
        );
      }}
    </Shell>
  );
}

export function IpKind({ kind }: { kind: UserLogEntry['ipType'] }) {
  const t = useTranslations();
  if (kind === 'external') return <span className="whitespace-nowrap text-xs text-ink-2" title={t('lg.ip.externalSr')}><span aria-hidden className="mr-1 inline-block size-1.5 rounded-full bg-c-review align-middle" />{t('lg.ip.external')}</span>;
  if (kind === 'internal') return <span className="whitespace-nowrap text-xs text-ink-3">{t('lg.ip.internal')}</span>;
  return null;
}

/* ---------- Tra cứu mã ---------- */
export function TaskRefDrawer({ entry, onClose, onTaskLog }: { entry: TaskRefEntry | null; onClose: () => void; onTaskLog: (title: string) => void }) {
  const t = useTranslations();
  const f = useFormat();
  return (
    <Shell item={entry} title={t('lg.dr.ref')} onClose={onClose} testId="lg-drawer"
      footer={(e) => (
        <>
          <Button type="button" variant="outline" size="md" className="max-[680px]:h-11" onClick={() => onTaskLog(e.title)} data-testid="lg-dr-tasklog">{t('lg.dr.taskLog')}</Button>
          <Button asChild size="md" className="max-[680px]:h-11">
            <Link href={`/tasks/${e.id}`} data-testid="lg-dr-open"><ExternalLink aria-hidden />{t('lg.dr.openTask')}</Link>
          </Button>
        </>
      )}>
      {(e) => (
        <>
          <StatusDot status={e.status} className="text-sm text-ink" />
          <TaskHead code={e.taskCode} title={e.title} id={e.id} />
          <div className="mt-[18px]">
            <Kv rows={[
              e.taskCode ? [t('lg.col.code'), <span key="c" className="flex items-center gap-0.5"><span className="font-mono text-[13px]">{e.taskCode}</span><CopyBtn value={e.taskCode} /></span>] : null,
              [t('lg.col.id'), <span key="i" className="flex min-w-0 items-center gap-0.5"><span className="font-mono text-[13px] [overflow-wrap:anywhere]">{e.id}</span><CopyBtn value={e.id} /></span>],
              [t('lg.dr.creator'), <Person key="p" name={e.creator.displayName} size="xs" />],
              [t('lg.dr.created'), <span key="d" className="font-mono text-[13px]">{fullDateTime(e.createdAt, f.locale)}</span>],
              [t('lg.dr.sched'), <span key="s" className="font-mono text-[13px]">{f.date(e.scheduleStart)} → {f.date(e.scheduleEnd)}</span>],
            ]} />
          </div>
        </>
      )}
    </Shell>
  );
}

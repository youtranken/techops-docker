'use client';

/**
 * Các ô của biểu mẫu Tạo / Sửa công việc V2 — preview `task-form.js` (+ `task-form.css`).
 * Bố cục do nơi dùng ghép: ngăn trượt (1 cột: Tiêu đề, Mô tả, khối Thiết lập, Tệp) · trang (2 thẻ Nội dung | Thiết lập).
 * Hành vi giữ V1: nguồn người làm = `/api/tasks/assignable-users`, người đã nhận + người tạo bị khoá khi Sửa,
 * ★ / Bắt buộc chỉ Boss/Admin, đổi chế độ khi Sửa chỉ nhân viên + việc Chờ duyệt, luật tệp V1 (`AttachmentField`).
 */
import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  AlertCircle, Bold, Italic, Underline, List, ListOrdered, Minus, Search, Lock, Star, ShieldCheck, Settings2, FileText, Undo2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusDot } from '@/shared/ui/StatusDot';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { AttachmentField } from '../../actions/components/modals/AttachmentField';
import { fileSizeLabel } from '../../actions/components/modals/action-dialog-rules';
import { MAX_FILE_COUNT } from '../CreateTask/attachment-rules';
import { useRichEditor, TOOLBAR_CMDS } from '../CreateTask/useRichEditor';
import { useAssignableUsers } from '../../hooks/useAssignableUsers';
import { canSwitchWorkflow, initialStatus, lockedAssignees, type FieldKey, type Msg } from './form-logic';
import type { TaskFormModel } from './useTaskForm';

// ───────────────────────────── khung ô ─────────────────────────────
export const ctl = cn(
  'block w-full rounded-ctl border border-line-2 bg-surface px-2.5 text-sm text-ink placeholder:text-ink-3',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-danger disabled:opacity-60',
);

function Err({ id, msg }: { id: string; msg?: Msg }) {
  const t = useTranslations();
  if (!msg) return null;
  return (
    <p id={id} className="m-0 mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger" data-err={id}>
      <AlertCircle aria-hidden className="size-3.5 flex-none" />
      <span>{t(msg.key, msg.values)}</span>
    </p>
  );
}

function Req() {
  const t = useTranslations();
  return <>{' '}<span className="text-danger" aria-hidden="true">*</span><span className="sr-only"> ({t('app.req')})</span></>;
}

const lbl = 'mb-1.5 block text-[13px] font-medium text-ink';

/** id DOM của từng ô (để focus lỗi đầu tiên) */
export const FIELD_DOM_ID: Record<FieldKey, string> = {
  title: 'tf-title', content: 'tf-desc', assigneeIds: 'tf-pq', typeId: 'tf-type', priorityId: 'tf-pr',
  scheduleStart: 'tf-start', scheduleEnd: 'tf-due',
};

// ───────────────────────────── Tiêu đề ─────────────────────────────
export function TitleField({ f }: { f: TaskFormModel }) {
  const t = useTranslations();
  const max = f.mode === 'create' ? 150 : 255;
  const n = f.values.title.length;
  const e = f.errors.title;
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="tf-title" className={lbl}>{t('tf.f.title._')}<Req /></label>
        <span aria-hidden className={cn('font-mono text-xs text-ink-3', n > max && 'text-danger')} data-testid="tf-title-count">{n}/{max}</span>
      </div>
      <input
        id="tf-title"
        autoComplete="off"
        aria-required
        aria-invalid={e ? true : undefined}
        aria-describedby={e ? 'tf-title-err' : undefined}
        placeholder={t('tf.f.title.ph')}
        value={f.values.title}
        onChange={(ev) => f.set({ title: ev.target.value })}
        className={cn(ctl, 'h-11 text-base font-medium')}
      />
      <Err id="tf-title-err" msg={e} />
    </div>
  );
}

// ───────────────────────────── Mô tả (soạn thảo V1) ─────────────────────────────
const ED_ICONS = { bold: Bold, italic: Italic, underline: Underline, insertUnorderedList: List, insertOrderedList: ListOrdered, insertHorizontalRule: Minus } as const;
const ED_LABEL: Record<string, string> = {
  bold: 'tf.ed.b', italic: 'tf.ed.i', underline: 'tf.ed.u', insertUnorderedList: 'tf.ed.ul', insertOrderedList: 'tf.ed.ol', insertHorizontalRule: 'tfx.ed.hr',
};

export function DescField({ f, compact }: { f: TaskFormModel; compact?: boolean }) {
  const t = useTranslations();
  const onChange = React.useCallback((html: string) => f.set({ content: html }), [f.set]); // eslint-disable-line react-hooks/exhaustive-deps
  const { editorRef, focused, setFocused, activeFormats, updateActiveFormats, handleInput, execCmd } = useRichEditor(f.values.content, onChange);
  const e = f.errors.content;
  const empty = !f.values.content.replace(/<[^>]+>/g, '').trim() && !/<(li|ul|ol|hr)/i.test(f.values.content);
  const n = f.values.content.replace(/<[^>]+>/g, '').trim().length;
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-2">
        <div id="tf-desc-lbl" className={lbl}>{t('tf.f.desc._')}<Req /></div>
        {f.mode === 'create' && <span aria-hidden className={cn('font-mono text-xs text-ink-3', n > 5000 && 'text-danger')}>{n}/5000</span>}
      </div>
      <div className={cn(
        'overflow-hidden rounded-ctl border border-line-2 bg-surface',
        focused && 'border-primary ring-[3px] ring-primary-soft',
        e && 'border-danger',
      )}>
        <div role="toolbar" aria-label={t('tf.ed.toolbar')} aria-controls="tf-desc" className="flex items-center gap-0.5 border-b border-line bg-surface-2 p-1">
          {TOOLBAR_CMDS.map(({ cmd }, i) => {
            const Icon = ED_ICONS[cmd];
            return (
              <React.Fragment key={cmd}>
                {i === 3 && <span aria-hidden className="mx-1 h-[18px] w-px bg-line-2" />}
                <button
                  type="button"
                  aria-label={t(ED_LABEL[cmd])}
                  title={t(ED_LABEL[cmd])}
                  aria-pressed={activeFormats.has(cmd)}
                  onMouseDown={(ev) => { ev.preventDefault(); execCmd(cmd); }}
                  className="grid h-[30px] w-8 place-items-center rounded-sm text-ink-2 hover:bg-surface hover:text-ink aria-pressed:bg-surface aria-pressed:text-primary-text aria-pressed:shadow-v2-1 max-[680px]:h-10 max-[680px]:w-10"
                >
                  <Icon aria-hidden className="size-4" />
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="relative">
          {empty && (
            <span aria-hidden className="pointer-events-none absolute left-3 right-3 top-2.5 text-sm text-ink-3">{t('tf.f.desc.ph')}</span>
          )}
          <div
            id="tf-desc"
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-labelledby="tf-desc-lbl"
            aria-required="true"
            aria-invalid={e ? true : undefined}
            aria-describedby={e ? 'tf-desc-err' : undefined}
            tabIndex={0}
            onInput={handleInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            className={cn(
              'overflow-y-auto px-3 py-2.5 text-sm leading-relaxed text-ink outline-none [overflow-wrap:anywhere]',
              compact ? 'min-h-[132px] max-h-[300px]' : 'min-h-[188px] max-h-[440px] max-[680px]:min-h-[150px]',
              '[&_p]:m-0 [&_p]:mb-1.5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-[22px] [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-[22px] [&_li]:my-0.5 [&_hr]:my-2 [&_hr]:border-line-2 [&_b]:font-semibold [&_strong]:font-semibold',
            )}
          />
        </div>
      </div>
      <Err id="tf-desc-err" msg={e} />
    </div>
  );
}

// ───────────────────────────── Tệp ─────────────────────────────
/** Tệp: dùng lại AttachmentField (luật V1, kéo thả, dán ảnh). Sửa: tệp cũ hiện phía trên, bấm × = "Sẽ xoá khi lưu". */
export function FilesField({ f, active }: { f: TaskFormModel; active: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const existing = f.task?.attachments ?? [];
  const keptOld = existing.filter((a) => !f.removedIds.includes(a.id)).length;
  const [oldErr, setOldErr] = React.useState(false);
  return (
    <div data-testid="tf-files">
      {existing.length > 0 && (
        <ul className="m-0 mb-2 flex list-none flex-col gap-1.5 p-0" aria-label={t('app.att.label')}>
          {existing.map((a) => {
            const rm = f.removedIds.includes(a.id);
            return (
              <li key={a.id} className="flex min-w-0 items-center gap-2 rounded-ctl border border-line py-1 pl-2.5 pr-1 text-[13px]">
                <FileText aria-hidden className="size-4 flex-none text-ink-3" />
                <span className={cn('min-w-0 flex-1 truncate text-ink', rm && 'text-ink-3 line-through')} title={a.fileName}>{a.fileName}</span>
                {rm ? (
                  <>
                    <span className="flex-none text-xs text-ink-3">{t('tf.att.removed')}</span>
                    <button
                      type="button"
                      aria-label={t('tf.att.keep', { f: a.fileName })}
                      onClick={() => {
                        // Khôi phục tệp cũ cũng tính vào giới hạn (V1 EditTaskFooter.toggleExisting)
                        if (keptOld + f.files.length >= MAX_FILE_COUNT) { setOldErr(true); return; }
                        setOldErr(false); f.toggleRemoved(a.id);
                      }}
                      className="inline-flex h-7 flex-none items-center gap-1 rounded-md px-2 text-xs font-medium text-primary-text hover:bg-primary-soft max-[680px]:h-10"
                    >
                      <Undo2 aria-hidden className="size-3.5" />{t('tf.att.undo')}
                    </button>
                  </>
                ) : (
                  <>
                    <small className="flex-none font-mono text-xs text-ink-3">{fileSizeLabel(a.fileSize, locale)}</small>
                    <button
                      type="button"
                      aria-label={t('app.att.remove', { f: a.fileName })}
                      onClick={() => { setOldErr(false); f.toggleRemoved(a.id); }}
                      className="grid size-7 flex-none place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-danger max-[680px]:size-10"
                    >
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {oldErr && <p role="alert" className="m-0 mb-2 text-xs font-medium text-danger">{t('tf.att.full', { n: MAX_FILE_COUNT })}</p>}
      <AttachmentField files={f.files} onChange={f.setFiles} active={active} baseCount={keptOld} />
    </div>
  );
}

// ───────────────────────────── Thiết lập ─────────────────────────────
function ModeField({ f }: { f: TaskFormModel }) {
  const t = useTranslations();
  const locked = f.mode === 'edit' && f.task ? !canSwitchWorkflow(f.isBossOrAdmin, f.task.status) : false;
  const opts = [
    { v: 'IMMEDIATE' as const, label: t('td.mode.direct'), d: t('tf.mode.direct.d') },
    { v: 'NEED_APPROVAL' as const, label: t('td.mode.approval'), d: t(f.isBossOrAdmin ? 'tf.mode.approval.d.boss' : 'tf.mode.approval.d.emp') },
  ];
  return (
    <div className="mb-4">
      <div id="tf-mode-lbl" className={lbl}>{t('tf.f.mode')}</div>
      <div role="radiogroup" aria-labelledby="tf-mode-lbl" className="tf-modes grid gap-2" data-testid="tf-mode">
        {opts.map((o) => {
          const on = f.values.workflowMode === o.v;
          return (
            <label
              key={o.v}
              className={cn(
                'grid cursor-pointer grid-cols-[16px_minmax(0,1fr)] gap-x-2.5 rounded-ctl border border-line-2 bg-surface px-3 py-2.5 hover:border-ink-3',
                on && 'border-primary shadow-[inset_0_0_0_1px_var(--primary)]',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                locked && 'cursor-not-allowed hover:border-line-2',
                locked && !on && 'opacity-55',
              )}
            >
              <input
                type="radio"
                name="tf-mode"
                value={o.v}
                checked={on}
                disabled={locked}
                onChange={() => f.set({ workflowMode: o.v })}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                <b className="block text-sm font-medium leading-snug text-ink">{o.label}</b>
                <small className="mt-0.5 block text-xs leading-snug text-ink-2">{o.d}</small>
              </span>
            </label>
          );
        })}
      </div>
      {locked && (
        <p className="m-0 mt-2 flex items-start gap-1.5 text-xs text-ink-2"><Lock aria-hidden className="mt-px size-3.5 flex-none text-ink-3" />{t('tfx.mode.fixed')}</p>
      )}
    </div>
  );
}

function PeopleField({ f }: { f: TaskFormModel }) {
  const t = useTranslations();
  const { data, isLoading } = useAssignableUsers();
  const [q, setQ] = React.useState('');
  const users = React.useMemo(() => {
    const all = data?.data ?? [];
    const me = all.find((u) => u.id === f.currentUserId);
    return me ? [me, ...all.filter((u) => u !== me)] : all;
  }, [data, f.currentUserId]);
  const locks = f.mode === 'edit' && f.task ? lockedAssignees(f.task) : {};
  const needle = q.trim().toLowerCase();
  const shown = needle ? users.filter((u) => u.displayName.toLowerCase().includes(needle) || u.username.toLowerCase() === needle) : users;
  const sel = f.values.assigneeIds.filter(Boolean);
  const e = f.errors.assigneeIds;
  const hasLock = Object.keys(locks).some((id) => f.values.assigneeIds.includes(id));

  function toggle(id: string) {
    if (locks[id]) return;
    const cur = f.values.assigneeIds;
    f.set({ assigneeIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  }

  return (
    <div className="mb-4">
      <div id="tf-people-lbl" className={lbl}>{t('tf.f.people')}<Req /></div>
      <label className="relative flex h-9 items-center max-[680px]:h-11">
        <Search aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-ink-3" />
        <span className="sr-only">{t('tf.people.search')}</span>
        <input
          id="tf-pq"
          type="search"
          autoComplete="off"
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder={t('tf.people.search')}
          aria-controls="tf-plist"
          aria-describedby={e ? 'tf-people-err' : undefined}
          aria-invalid={e ? true : undefined}
          className={cn(ctl, 'h-full pl-8')}
        />
      </label>
      <div
        id="tf-plist"
        role="group"
        aria-labelledby="tf-people-lbl"
        data-testid="tf-people"
        className={cn('tf-pl mt-2 overflow-y-auto rounded-ctl border border-line-2 bg-surface [scrollbar-width:thin]', e && 'border-danger')}
      >
        {isLoading && <p className="m-0 px-3 py-3 text-[13px] text-ink-3">{t('tfx.people.loading')}</p>}
        {!isLoading && shown.length === 0 && <p className="m-0 px-3 py-3.5 text-[13px] text-ink-3">{t('tf.people.none', { q: q.trim() })}</p>}
        {shown.map((u) => {
          const on = f.values.assigneeIds.includes(u.id);
          const lk = locks[u.id];
          return (
            <label
              key={u.id}
              className={cn(
                'flex min-h-[42px] items-center gap-2.5 border-t border-line px-2.5 py-1.5 text-sm first:border-t-0 max-[680px]:min-h-11',
                lk ? 'cursor-default' : 'cursor-pointer hover:bg-surface-2',
              )}
            >
              <input
                type="checkbox"
                value={u.id}
                checked={on}
                disabled={!!lk}
                onChange={() => toggle(u.id)}
                className="size-4 flex-none accent-[var(--primary)] disabled:opacity-60"
                aria-describedby={lk ? 'tf-lock-hint' : undefined}
              />
              <UserAvatar displayName={u.displayName} size="sm" />
              <span className="min-w-0 flex-1 truncate text-ink">
                {u.displayName}
                {u.id === f.currentUserId && <small className="ml-1 text-xs text-ink-3">{t('tf.people.you')}</small>}
              </span>
              {lk ? (
                <span className="inline-flex flex-none items-center gap-1 text-xs text-ink-3">
                  <Lock aria-hidden className="size-3" />
                  {lk.map((k) => t(k === 'creator' ? 'tf.people.creator' : 'tf.people.locked')).join(' · ')}
                </span>
              ) : u.role.name === 'BOSS' ? (
                <span className="flex-none text-xs text-ink-3">{t('role.boss')}</span>
              ) : null}
            </label>
          );
        })}
      </div>
      <Err id="tf-people-err" msg={e} />
      <div className="mt-1.5 flex justify-between gap-2 text-xs text-ink-3" aria-live="polite">
        <span>{sel.length > 0 && <b className="font-medium text-ink-2">{t('tf.people.n', { n: sel.length })}</b>}</span>
      </div>
      {hasLock && <p id="tf-lock-hint" className="m-0 mt-1 text-xs text-ink-3">{t('tf.people.lockHint')}</p>}
    </div>
  );
}

function DatesAndKinds({ f }: { f: TaskFormModel }) {
  const t = useTranslations();
  const today = new Date().toISOString().slice(0, 10);
  const es = f.errors.scheduleStart;
  const ee = f.errors.scheduleEnd;
  const ep = f.errors.priorityId;
  const et = f.errors.typeId;
  const prColor = f.priorities.find((p) => p.id === f.values.priorityId)?.color;
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tf-start" className={lbl}>{t('tf.f.start')}{f.mode === 'create' && <Req />}</label>
          <input
            id="tf-start" type="date" value={f.values.scheduleStart}
            onChange={(ev) => f.set({ scheduleStart: ev.target.value })}
            aria-invalid={es ? true : undefined} aria-describedby={es ? 'tf-start-err' : undefined}
            className={cn(ctl, 'h-[38px] px-2 font-mono max-[680px]:h-11')}
          />
          <Err id="tf-start-err" msg={es} />
        </div>
        <div>
          <label htmlFor="tf-due" className={lbl}>{t('tf.f.due')}<Req /></label>
          <input
            id="tf-due" type="date" value={f.values.scheduleEnd}
            min={f.values.scheduleStart || today}
            onChange={(ev) => f.set({ scheduleEnd: ev.target.value })}
            aria-required aria-invalid={ee ? true : undefined} aria-describedby={ee ? 'tf-due-err' : undefined}
            className={cn(ctl, 'h-[38px] px-2 font-mono max-[680px]:h-11')}
          />
          <Err id="tf-due-err" msg={ee} />
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tf-pr" className={lbl}>{t('filter.priority')}<Req /></label>
          <div className="relative">
            {prColor && <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full" style={{ background: prColor }} />}
            <select
              id="tf-pr" value={f.values.priorityId}
              onChange={(ev) => f.set({ priorityId: ev.target.value })}
              aria-invalid={ep ? true : undefined} aria-describedby={ep ? 'tf-pr-err' : undefined}
              className={cn(ctl, 'h-[38px] max-[680px]:h-11', prColor && 'pl-7')}
            >
              {!f.values.priorityId && <option value="">—</option>}
              {f.priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Err id="tf-pr-err" msg={ep} />
        </div>
        <div>
          <label htmlFor="tf-type" className={lbl}>{t('tf.f.type')}<Req /></label>
          <select
            id="tf-type" value={f.values.typeId}
            onChange={(ev) => f.set({ typeId: ev.target.value })}
            aria-invalid={et ? true : undefined} aria-describedby={et ? 'tf-type-err' : undefined}
            className={cn(ctl, 'h-[38px] max-[680px]:h-11')}
          >
            {!f.values.typeId && <option value="">—</option>}
            {f.taskTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <Err id="tf-type-err" msg={et} />
        </div>
      </div>
    </>
  );
}

function BossFields({ f, compact }: { f: TaskFormModel; compact?: boolean }) {
  const t = useTranslations();
  if (!f.isBossOrAdmin) return null;
  const direct = f.values.workflowMode !== 'NEED_APPROVAL';
  const sw = 'grid cursor-pointer grid-cols-[16px_minmax(0,1fr)] gap-x-2.5 py-2';
  return (
    <div role="group" aria-labelledby="tf-boss-h" className={cn('mt-1 border-t border-line pt-3.5', compact && 'grid grid-cols-2 gap-x-4 max-[680px]:grid-cols-1')}>
      <h3 id="tf-boss-h" className="col-span-full m-0 mb-1 text-xs font-medium text-ink-3">{t('tf.boss.h')}</h3>
      <label className={sw}>
        <input type="checkbox" id="tf-star" checked={f.values.isImportant} onChange={(ev) => f.set({ isImportant: ev.target.checked })} className="mt-0.5 size-4 accent-[var(--primary)]" aria-describedby="tf-star-d" />
        <span>
          <b className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Star aria-hidden className={cn('size-[15px] text-ink-3', f.values.isImportant && 'fill-amber text-amber')} />{t('tf.star._')}
          </b>
          <small id="tf-star-d" className="mt-0.5 block text-xs leading-snug text-ink-2">{t('tf.star.d')}</small>
        </span>
      </label>
      {/* V1: công tắc Bắt buộc luôn bật/tắt được; server chỉ áp dụng khi Phê duyệt (task-create.service G4) */}
      <label className={sw}>
        <input type="checkbox" id="tf-force" checked={f.values.isForceMode} onChange={(ev) => f.set({ isForceMode: ev.target.checked })} className="mt-0.5 size-4 accent-[var(--primary)]" aria-describedby="tf-force-d" />
        <span>
          <b className="flex items-center gap-1.5 text-sm font-medium text-ink"><ShieldCheck aria-hidden className="size-[15px] text-ink-3" />{t('tf.force._')}</b>
          <small id="tf-force-d" className="mt-0.5 block text-xs leading-snug text-ink-2">
            {t('tf.force.d')}{direct && <> {t('tfx.force.direct')}</>}
          </small>
        </span>
      </label>
    </div>
  );
}

/** Khối Thiết lập: Chế độ · Người làm · Ngày · Ưu tiên/Loại · (Boss/Admin) ★ + Bắt buộc */
export function SetupFields({ f, compact }: { f: TaskFormModel; compact?: boolean }) {
  return (
    <>
      <ModeField f={f} />
      <PeopleField f={f} />
      <DatesAndKinds f={f} />
      <BossFields f={f} compact={compact} />
    </>
  );
}

export function SetupIcon() { return <Settings2 aria-hidden className="size-4 text-ink-3" />; }

// ───────────────────────────── Thông báo đầu form + dòng tóm tắt ─────────────────────────────
export function TopNote({ f, errMsg }: { f: TaskFormModel; errMsg: (e: unknown) => string }) {
  const t = useTranslations();
  const n = Object.keys(f.errors).length;
  if (f.serverError) {
    return (
      <div id="tf-srv" role="alert" tabIndex={-1} className="mb-4 flex items-start gap-2 rounded-ctl border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm text-ink" data-testid="tf-server-error">
        <AlertCircle aria-hidden className="mt-0.5 size-4 flex-none text-danger" />
        <div><b className="block font-semibold">{t('tf.e.server.t')}</b>{errMsg(f.serverError)}</div>
      </div>
    );
  }
  if (f.tried && n) {
    return (
      <div role="alert" className="mb-4 flex items-start gap-2 rounded-ctl border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm text-ink" data-testid="tf-error-sum">
        <AlertCircle aria-hidden className="mt-0.5 size-4 flex-none text-danger" />
        <div>{t('tf.e.sum', { n })}</div>
      </div>
    );
  }
  return null;
}

export function SummaryLine({ f, users }: { f: TaskFormModel; users?: { id: string; displayName: string }[] }) {
  const t = useTranslations();
  if (f.mode === 'edit') {
    return f.dirty
      ? <span className="font-medium text-ink">{t('tfx.sum.dirty')}</span>
      : <span className="text-ink-3">{t('tf.sum.nochange')}</span>;
  }
  const ids = f.values.assigneeIds.filter(Boolean);
  const st = initialStatus(f.role, f.values.workflowMode, ids, f.currentUserId);
  if (!st) return <span className="text-ink-3">{t('tf.sum.none')}</span>;
  const who = ids.length === 1
    ? (ids[0] === f.currentUserId ? t('tf.sum.you') : users?.find((u) => u.id === ids[0])?.displayName ?? t('tf.sum.n', { n: 1 }))
    : t('tf.sum.n', { n: ids.length });
  const k = st === 'PENDING_APPROVAL' ? 'tf.sum.approval' : st === 'IN_PROGRESS' ? 'tf.sum.self' : f.values.workflowMode === 'NEED_APPROVAL' ? 'tf.sum.skip' : 'tf.sum.give';
  return (
    <>
      <span className="font-medium text-ink">{t(k, { a: who })}</span>
      <span aria-hidden className="text-ink-3">·</span>
      <span>{t('tf.sum.start')}</span>
      <StatusDot status={st} />
    </>
  );
}

/** Đưa focus tới ô lỗi đầu tiên */
export function focusField(k: FieldKey | undefined) {
  if (!k) return;
  const el = document.getElementById(FIELD_DOM_ID[k]);
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  (el as HTMLElement).focus({ preventScroll: true });
}

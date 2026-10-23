'use client';

/**
 * Bảng Kanban V2 (A2-4a) — preview `tasks-board.html` (B2: kéo thả có kiểm soát).
 *
 * - Cột theo trạng thái V1 (`board-logic.ts`), mỗi cột tải riêng qua API danh sách V1 (`useBoardData`).
 * - Thẻ gọn: mã · chưa xem · ★ · ⋯ / tiêu đề / loại · ưu tiên / người làm · bình luận · hạn; nút hành động đến lượt mình.
 * - Kéo thả CHỈ là lối tắt: thả đúng cột kế tiếp mà người xem có quyền (`dropActionFor`) → mở hộp thoại A2-2
 *   (không gọi API ngay); đóng/hủy hộp → thẻ về chỗ cũ. Không kéo lùi, không hủy, không sắp thứ tự.
 * - Tắt kéo thả khi ≤680px hoặc không có chuột chính xác (cảm ứng) → dùng nút trên thẻ / menu ⋯.
 * - Bàn phím: nút hành động trên thẻ (có nhãn "… → cột") và menu ⋯ thay cho kéo.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Info, X, MessageCircle, Users, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PriorityFlag } from '@/shared/ui/PriorityFlag';
import { DueText } from '@/shared/ui/DueText';
import { ErrorState, EmptyState, Skeleton } from '@/shared/ui/States';
import { useTaskPermissions } from '../../actions/hooks/useTaskPermissions';
// Hàm thuần (không dùng hook React bên trong) — gọi trong xử lý sự kiện kéo thả
import { useTaskPermissions as taskPermissions } from '../../actions/hooks/useTaskPermissions';
import type { TaskListItem } from '../../services/task-query.service';
import { displayCode } from './list-logic';
import { forwardMove, dropActionFor, columnOf, COL_LIMIT_MAX, type BoardCol, type DropAction } from './board-logic';
import { StarToggle, People, RowMenu, type TaskRowAction } from './TaskListGrid';
import type { BoardColumnData } from './useBoardData';

const COL_COLOR: Record<BoardCol, string> = {
  PENDING_APPROVAL: 'var(--c-approval)',
  WAITING_ACKNOWLEDGE: 'var(--c-pickup)',
  IN_PROGRESS: 'var(--c-progress)',
  PENDING_REVIEW: 'var(--c-review)',
  COMPLETED: 'var(--c-done)',
  CANCELLED: 'var(--ink-3)',
};
/** Nhãn nút / nhãn thả theo hành động (khoá copy.js `act.*`, `dnd.drop.*`) */
const ACT_LABEL: Record<DropAction | 'acknowledge-only', string> = {
  'approve-plan': 'act.approve', acknowledge: 'act.accept', complete: 'act.report', 'approve-review': 'act.review', 'acknowledge-only': 'act.accept',
};
const DROP_LABEL: Record<DropAction, string> = {
  'approve-plan': 'dnd.drop.approve', acknowledge: 'dnd.drop.accept', complete: 'dnd.drop.report', 'approve-review': 'dnd.drop.review',
};
const TIP_KEY = 'techops.board.tip';

// ───────────────────────────── Bật/tắt kéo thả ─────────────────────────────
const DND_QUERY = '(min-width: 681px) and (hover: hover) and (pointer: fine)';
function useDndEnabled() {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DND_QUERY);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(DND_QUERY).matches,
    () => false,
  );
}

function useTip(): [boolean, () => void] {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    try { setOn(window.localStorage.getItem(TIP_KEY) !== 'off'); } catch { setOn(true); }
  }, []);
  const close = React.useCallback(() => {
    setOn(false);
    try { window.localStorage.setItem(TIP_KEY, 'off'); } catch { /* bỏ qua: chế độ riêng tư */ }
  }, []);
  return [on, close];
}

// ───────────────────────────── Thẻ ─────────────────────────────
export interface PendingDrop { taskId: string; from: BoardCol; to: BoardCol; action: DropAction }

interface CardProps {
  task: TaskListItem;
  currentUserId: string;
  role: string;
  canStar: boolean;
  dnd: boolean;
  selected?: boolean;
  /** Thẻ đang được kéo / chờ hộp thoại → để mờ ở chỗ cũ */
  origin?: boolean;
  /** Bản sao (bóng khi kéo / chỗ thả chờ xác nhận): không tương tác */
  ghost?: boolean;
  onAction: (a: TaskRowAction) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>, task: TaskListItem) => void;
}

/** "x/n người đã nhận" / "x/n đã báo cáo" khi việc Đang làm có ≥2 người làm (preview `note`). */
function multiNote(task: TaskListItem): { key: string; x: number; n: number; dots?: boolean[] } | null {
  const act = task.assignees.filter((a) => !['REJECTED', 'TRANSFERRED', 'CANCELLED'].includes(a.status));
  if (act.length < 2 || task.status !== 'IN_PROGRESS') return null;
  const accepted = act.filter((a) => a.status !== 'PENDING').length;
  if (accepted < act.length) return { key: 'dnd.accepted', x: accepted, n: act.length };
  const done = act.map((a) => a.status === 'COMPLETED');
  const reported = done.filter(Boolean).length;
  return reported ? { key: 'dnd.reported', x: reported, n: act.length, dots: done } : null;
}

const BoardCard = React.memo(function BoardCard({
  task, currentUserId, role, canStar, dnd, selected, origin, ghost, onAction, onPointerDown,
}: CardProps) {
  const t = useTranslations();
  const p = useTaskPermissions(task, currentUserId, role);
  const move = forwardMove(task, p);
  // Nút trên thẻ: bước tiến của mình; hoặc Nhận việc khi được chuyển giao lúc việc đang làm (không đổi cột)
  const primary: DropAction | null = move?.action ?? (p.canAcknowledge ? 'acknowledge' : null);
  const draggable = dnd && !!move && !ghost;
  const code = displayCode(task);
  const comments = task._count?.comments ?? 0;
  const note = multiNote(task);
  const act = (key: TaskRowAction['key']) => (e: React.MouseEvent) => { e.stopPropagation(); onAction({ key, task }); };

  return (
    <article
      data-card-id={ghost ? undefined : task.id}
      data-draggable={draggable ? 'true' : undefined}
      tabIndex={ghost ? -1 : 0}
      aria-hidden={ghost || undefined}
      aria-label={`${code} · ${task.title}`}
      aria-describedby={draggable ? 'tb-dnd-instr' : undefined}
      aria-haspopup="dialog"
      aria-current={selected || undefined}
      onClick={ghost ? undefined : () => onAction({ key: 'view', task })}
      onKeyDown={ghost ? undefined : (e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); onAction({ key: 'view', task }); }
      }}
      onPointerDown={draggable && onPointerDown ? (e) => onPointerDown(e, task) : undefined}
      className={cn(
        'group/card relative flex-none overflow-hidden rounded-[10px] border border-line bg-surface text-left shadow-v2-1 outline-none',
        'transition-[border-color,box-shadow] hover:border-line-2 hover:shadow-v2-2 focus-visible:ring-2 focus-visible:ring-ring',
        ghost ? 'pointer-events-none' : 'cursor-pointer',
        draggable && 'cursor-grab',
        selected && 'border-primary-text',
        origin && 'border-dashed border-line-2 opacity-40 shadow-none',
      )}
    >
      {task.isUnseen && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-c-done" />}
      {draggable && (
        <span aria-hidden title={t('dnd.grip')} className="absolute left-px top-1/2 -mt-2 text-ink-3 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
          <svg viewBox="0 0 10 16" width="10" height="16"><g fill="currentColor"><circle cx="2.5" cy="3" r="1.4" /><circle cx="7.5" cy="3" r="1.4" /><circle cx="2.5" cy="8" r="1.4" /><circle cx="7.5" cy="8" r="1.4" /><circle cx="2.5" cy="13" r="1.4" /><circle cx="7.5" cy="13" r="1.4" /></g></svg>
        </span>
      )}
      <div className="px-3 pb-[11px] pt-2.5">
        <div className="flex h-[22px] items-center gap-1.5">
          <span className="font-mono text-xs text-ink-3" data-code>{code}</span>
          {task.isUnseen && (
            <span className="text-xs font-semibold text-c-done" data-unseen>· {t('card.new')}</span>
          )}
          <span className="-mr-1.5 ml-auto flex items-center">
            {canStar && !ghost && <StarToggle task={task} />}
            {canStar && ghost && task.isImportant && <span className="text-amber">★</span>}
            {!ghost && <RowMenu task={task} currentUserId={currentUserId} role={role} onAction={onAction} />}
          </span>
        </div>
        <h3 className="mb-1.5 mt-1 line-clamp-2 text-sm font-medium leading-[1.4] text-ink [overflow-wrap:anywhere]" data-title>
          {task.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-2">
          <span>{task.type.name}</span>
          <span aria-hidden className="text-line-2">·</span>
          <PriorityFlag level={task.priority.level} name={task.priority.name} className="text-xs" />
        </div>
        {note && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-2">
            {note.dots ? (
              <span aria-hidden className="inline-flex gap-[3px]">
                {note.dots.map((on, i) => <i key={i} className={cn('size-[7px] rounded-full', on ? 'bg-c-done' : 'bg-line-2')} />)}
              </span>
            ) : <Users aria-hidden className="size-3.5 text-ink-3" />}
            <span>{t(note.key, { x: note.x, n: note.n })}</span>
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-2">
          <People task={task} />
          <span className="ml-auto flex items-center gap-2.5 whitespace-nowrap text-xs text-ink-3">
            {comments > 0 && (
              <span className={cn('inline-flex items-center gap-[3px]', task.hasMention && 'text-primary-text')} title={t('card.comments', { n: comments })}>
                <MessageCircle aria-hidden className="size-[13px]" />
                <span className="font-mono">{comments}</span>
                <span className="sr-only">{t('card.comments', { n: comments })}</span>
              </span>
            )}
            <DueText dueDate={task.scheduleEnd} status={task.status} className="text-xs" />
          </span>
        </div>
      </div>
      {primary && !ghost && (
        <div className="flex gap-1.5 border-t border-line bg-[color-mix(in_srgb,var(--surface-2)_55%,var(--surface))] px-3 py-2">
          <button
            type="button"
            onClick={act(primary)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={move ? t('tbx.actTo', { a: t(ACT_LABEL[primary]), s: t(`st.${move.to}`) }) : undefined}
            className="h-7 rounded-md border border-primary bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-fill-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-9"
          >
            {t(ACT_LABEL[primary])}
          </button>
          {primary === 'acknowledge' && p.canRejectTask && (
            <button
              type="button"
              onClick={act('reject-task')}
              onPointerDown={(e) => e.stopPropagation()}
              className="h-7 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-ink-2 hover:border-line-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-9"
            >
              {t('act.decline')}
            </button>
          )}
        </div>
      )}
    </article>
  );
});

function CardSkeleton() {
  return (
    <div data-board-skeleton className="flex-none rounded-[10px] border border-line bg-surface px-3 py-3">
      <Skeleton variant="line" className="h-2.5 w-14" />
      <Skeleton variant="line" className="mt-3 h-3.5 w-[85%]" />
      <Skeleton variant="line" className="mt-2 h-3 w-1/2" />
      <div className="mt-3 flex items-center justify-between">
        <Skeleton variant="circle" className="size-[22px]" />
        <Skeleton variant="line" className="h-3 w-16" />
      </div>
    </div>
  );
}

// ───────────────────────────── Bảng ─────────────────────────────
export interface TaskBoardProps {
  columns: BoardColumnData[];
  error: boolean;
  onRetry: () => void;
  currentUserId: string;
  role: string;
  selectedId?: string | null;
  pending: PendingDrop | null;
  /** Không có thẻ nào + đang lọc → thông điệp "không khớp bộ lọc" */
  filteredEmpty?: { onClear?: () => void } | null;
  onAction: (a: TaskRowAction) => void;
  /** Thả hợp lệ → trang mở hộp thoại hành động */
  onDrop: (d: PendingDrop, task: TaskListItem) => void;
  onShowMore: (col: BoardCol) => void;
  /** Cột vượt trần 100 thẻ / cột Đã xong bị ẩn ở tab Đang mở → sang danh sách / tab phù hợp */
  onOpenColumn: (col: BoardCol) => void;
  onShowDone: () => void;
  onCreate: () => void;
}

interface DragState {
  task: TaskListItem;
  from: BoardCol;
  to: BoardCol;
  action: DropAction;
  rect: DOMRect;
  sx: number; sy: number;
}

export function TaskBoard({
  columns, error, onRetry, currentUserId, role, selectedId, pending, filteredEmpty,
  onAction, onDrop, onShowMore, onOpenColumn, onShowDone, onCreate,
}: TaskBoardProps) {
  const t = useTranslations();
  const dnd = useDndEnabled();
  const [tipOn, closeTip] = useTip();
  const canStar = role === 'ADMIN' || role === 'BOSS';
  const scroller = React.useRef<HTMLDivElement>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [over, setOver] = React.useState<BoardCol | null>(null);
  const [flying, setFlying] = React.useState(false);
  const [live, setLive] = React.useState('');
  const press = React.useRef<{ task: TaskListItem; x: number; y: number; el: HTMLElement } | null>(null);
  const pos = React.useRef({ x: 0, y: 0 });
  const justDragged = React.useRef(false);
  const dragRef = React.useRef<DragState | null>(null);
  dragRef.current = drag;
  const onDropRef = React.useRef(onDrop);
  onDropRef.current = onDrop;

  const announce = React.useCallback((s: string) => { setLive(''); window.setTimeout(() => setLive(s), 40); }, []);
  const stLabel = React.useCallback((c: BoardCol) => t(`st.${c}`), [t]);

  const permsOf = React.useCallback((task: TaskListItem) => taskPermissions(task, currentUserId, role), [currentUserId, role]);

  // ── Bắt đầu kéo (chuột/bút; cảm ứng và ≤680 tắt) ──
  const onCardPointerDown = React.useCallback((e: React.PointerEvent<HTMLElement>, task: TaskListItem) => {
    if (e.button !== 0 || e.pointerType === 'touch' || dragRef.current) return;
    if ((e.target as HTMLElement).closest('button,a,input')) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    press.current = { task, x: e.clientX, y: e.clientY, el: e.currentTarget };
  }, []);

  const endDrag = React.useCallback(() => { setDrag(null); setOver(null); setFlying(false); }, []);

  const flyBack = React.useCallback((msg: string) => {
    announce(msg);
    const g = ghostRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!g || reduce) { endDrag(); return; }
    setFlying(true);
    g.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)';
    g.style.transform = 'translate(0px,0px)';
    window.setTimeout(endDrag, 210);
  }, [announce, endDrag]);

  const hitCol = (x: number, y: number): BoardCol | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const c = el?.closest<HTMLElement>('[data-col]')?.dataset.col;
    return c ? columnOf(c) : null;
  };

  // ── Theo dõi chuột trên toàn trang khi đang nhấn / kéo ──
  React.useEffect(() => {
    if (!dnd) return;
    let raf = 0;
    const loop = () => {
      const d = dragRef.current;
      if (!d) return;
      const g = ghostRef.current;
      if (g && !g.style.transition) g.style.transform = `translate(${pos.current.x - d.sx}px,${pos.current.y - d.sy}px) rotate(2deg)`;
      // tự cuộn ngang khi kéo sát mép vùng bảng
      const sc = scroller.current;
      if (sc) {
        const r = sc.getBoundingClientRect();
        const edge = 64;
        let v = 0;
        if (pos.current.y > r.top - 40 && pos.current.y < r.bottom + 40) {
          if (pos.current.x < r.left + edge) v = -Math.ceil((r.left + edge - pos.current.x) / 5);
          else if (pos.current.x > r.right - edge) v = Math.ceil((pos.current.x - (r.right - edge)) / 5);
        }
        if (v) sc.scrollLeft += v;
      }
      const c = hitCol(pos.current.x, pos.current.y);
      setOver(c === d.to ? c : null);
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      const p = press.current;
      if (p && !dragRef.current) {
        if (Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y) < 6) return;
        press.current = null;
        const m = forwardMove(p.task, permsOf(p.task));
        const from = columnOf(p.task.status);
        if (!m || !from) return;
        const d: DragState = { task: p.task, from, to: m.to, action: m.action, rect: p.el.getBoundingClientRect(), sx: p.x, sy: p.y };
        dragRef.current = d;
        setDrag(d);
        announce(t('dnd.sr.start', { id: displayCode(p.task), s: stLabel(m.to) }));
        // hiện cột đích nếu đang khuất
        const col = scroller.current?.querySelector<HTMLElement>(`[data-col="${m.to}"]`);
        const sc = scroller.current;
        if (col && sc) {
          const br = sc.getBoundingClientRect(); const cr = col.getBoundingClientRect();
          if (cr.right > br.right) sc.scrollBy({ left: cr.right - br.right + 12 });
          else if (cr.left < br.left) sc.scrollBy({ left: cr.left - br.left - 12 });
        }
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    };
    const onUp = (e: PointerEvent) => {
      press.current = null;
      const d = dragRef.current;
      if (!d || flying) return;
      cancelAnimationFrame(raf);
      justDragged.current = true;
      window.setTimeout(() => { justDragged.current = false; }, 0);
      const target = hitCol(e.clientX, e.clientY);
      const action = target ? dropActionFor(d.task, d.from, target, permsOf(d.task)) : null;
      if (target && action) {
        endDrag();
        onDropRef.current({ taskId: d.task.id, from: d.from, to: target, action }, d.task);
        return;
      }
      flyBack(target === d.from || !target
        ? t('dnd.sr.cancel', { id: displayCode(d.task), s: stLabel(d.from) })
        : t('dnd.sr.invalid', { id: displayCode(d.task) }));
    };
    const cancel = () => {
      press.current = null;
      const d = dragRef.current;
      if (d) { cancelAnimationFrame(raf); flyBack(t('dnd.sr.cancel', { id: displayCode(d.task), s: stLabel(d.from) })); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && dragRef.current) { e.preventDefault(); cancel(); } };
    const onClickCapture = (e: MouseEvent) => {
      if (justDragged.current) { e.stopPropagation(); e.preventDefault(); justDragged.current = false; }
    };
    if (dragRef.current) raf = requestAnimationFrame(loop); // effect chạy lại giữa lúc kéo → chạy tiếp vòng lặp
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClickCapture, true);
    window.addEventListener('blur', cancel);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('blur', cancel);
    };
  }, [dnd, flying, permsOf, flyBack, endDrag, announce, stLabel, t]);

  // Màn nhỏ lại giữa chừng → hủy kéo
  React.useEffect(() => { if (!dnd && dragRef.current) endDrag(); }, [dnd, endDrag]);

  // Thông báo khi vào cột đích
  React.useEffect(() => {
    const d = dragRef.current;
    if (d && over) announce(t('dnd.sr.over', { s: stLabel(d.to), a: t(ACT_LABEL[d.action]).toLowerCase() }));
  }, [over, announce, stLabel, t]);

  const dragging = !!drag;
  const pendingTask = pending ? columns.flatMap((c) => c.tasks).find((x) => x.id === pending.taskId) : undefined;

  if (error && columns.every((c) => !c.tasks.length)) {
    return <ErrorState title={t('tlx.loadErr')} onRetry={onRetry} className="rounded-card border border-line bg-surface" />;
  }

  return (
    <div data-board className={cn('relative', dragging && 'select-none [&_*]:!cursor-grabbing')}>
      {dnd && tipOn && (
        <div className="mb-3 flex items-center gap-2.5 rounded-ctl border border-[color-mix(in_srgb,var(--primary)_20%,var(--line))] bg-[color-mix(in_srgb,var(--primary-soft)_55%,var(--surface))] py-1.5 pl-3 pr-1.5 text-[13px] text-ink-2">
          <Info aria-hidden className="size-4 flex-none text-primary-text" />
          <span className="min-w-0 flex-1">{t('dnd.hint')}</span>
          <button type="button" onClick={closeTip} aria-label={t('dnd.hintClose')} className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}

      {filteredEmpty && (
        <EmptyState
          title={t('tl.f.none')}
          description={t('tl.f.noneD')}
          action={filteredEmpty.onClear ? <Button type="button" variant="outline" size="xs" onClick={filteredEmpty.onClear}>{t('tl.f.clear')}</Button> : undefined}
          className="mb-3 rounded-card border border-line bg-surface py-6"
        />
      )}

      <div
        ref={scroller}
        role="region"
        aria-label={t('tbx.board')}
        data-dragging={dragging || undefined}
        className={cn(
          'flex items-start gap-3 overflow-x-auto pb-2.5 [scrollbar-color:var(--line-2)_transparent] [scrollbar-width:thin]',
          'max-[680px]:-mx-4 max-[680px]:snap-x max-[680px]:snap-mandatory max-[680px]:scroll-pl-4 max-[680px]:px-4 max-[680px]:[scrollbar-width:none]',
        )}
      >
        {columns.map((c) => {
          const ok = dragging && drag!.to === c.col;
          const no = dragging && !ok;
          const isOver = ok && over === c.col;
          const showPending = pending && pending.to === c.col && pendingTask;
          const hiddenMore = c.total - c.tasks.length;
          return (
            <section
              key={c.col}
              data-col={c.col}
              data-drop={ok ? 'ok' : no ? 'no' : undefined}
              aria-labelledby={`tb-h-${c.col}`}
              style={{ ['--k' as string]: COL_COLOR[c.col] }}
              className={cn(
                'relative flex max-h-[max(380px,calc(100dvh-300px))] w-[272px] flex-none flex-col rounded-card bg-lane transition-[opacity,background-color]',
                'max-[680px]:max-h-none max-[680px]:w-[calc(100vw-48px)] max-[680px]:snap-start',
                no && 'opacity-45 [&_*]:!cursor-not-allowed',
                ok && 'min-h-[240px] bg-primary-soft outline-2 -outline-offset-2 outline-dashed outline-primary',
                isOver && 'bg-[color-mix(in_srgb,var(--primary)_14%,var(--surface))] outline-solid',
              )}
            >
              <div className="relative flex items-center gap-2 px-3.5 pb-2.5 pt-3 before:absolute before:inset-x-3.5 before:top-0 before:h-0.5 before:rounded-b-sm before:bg-[var(--k)] before:opacity-90">
                <span aria-hidden className="size-2 flex-none rounded-full bg-[var(--k)]" />
                <h2 id={`tb-h-${c.col}`} className="m-0 truncate font-head text-sm font-medium leading-[1.3] text-ink">{t(`st.${c.col}`)}</h2>
                <span className="ml-0.5 font-mono text-xs text-ink-3" data-count>{c.inFilter ? (c.loading ? '…' : c.total) : '—'}</span>
              </div>
              <div
                className="flex min-h-16 flex-col gap-2 overflow-y-auto px-2 pb-2.5 pt-1 [scrollbar-color:var(--line-2)_transparent] [scrollbar-width:thin] max-[680px]:max-h-none"
                data-col-body
              >
                {showPending && (
                  <div data-pending-card className="rounded-[10px] ring-2 ring-primary">
                    <BoardCard task={pendingTask!} currentUserId={currentUserId} role={role} canStar={canStar} dnd={false} ghost onAction={onAction} />
                  </div>
                )}
                {!c.inFilter ? (
                  <div className="rounded-[10px] border border-dashed border-line-2 px-2 py-5 text-center text-[13px] text-ink-3">
                    {c.col === 'COMPLETED' ? (
                      <>
                        <p className="m-0">{t('tbx.doneHidden')}</p>
                        <Button type="button" variant="ghost" size="xs" className="mt-1.5" onClick={onShowDone}>
                          {t('tbx.seeDone')}<ChevronRight aria-hidden />
                        </Button>
                      </>
                    ) : t('tbx.outFilter')}
                  </div>
                ) : c.loading ? (
                  <><CardSkeleton /><CardSkeleton /></>
                ) : c.tasks.length === 0 && !showPending ? (
                  <div className="rounded-[10px] border border-dashed border-line-2 px-2 py-5 text-center text-[13px] text-ink-3">
                    {t('lane.empty')}
                  </div>
                ) : (
                  c.tasks.map((x) => (
                    <BoardCard
                      key={x.id}
                      task={x}
                      currentUserId={currentUserId}
                      role={role}
                      canStar={canStar}
                      dnd={dnd}
                      selected={selectedId === x.id}
                      origin={drag?.task.id === x.id || pending?.taskId === x.id}
                      onAction={onAction}
                      onPointerDown={onCardPointerDown}
                    />
                  ))
                )}
                {c.inFilter && !c.loading && hiddenMore > 0 && (
                  c.limit < COL_LIMIT_MAX ? (
                    <Button type="button" variant="ghost" size="xs" className="self-center" onClick={() => onShowMore(c.col)}>
                      {t('tbx.more', { n: hiddenMore })}
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="xs" className="self-center" onClick={() => onOpenColumn(c.col)}>
                      {t('tbx.allInList', { n: c.total })}<ChevronRight aria-hidden />
                    </Button>
                  )
                )}
              </div>
              {ok && (
                <div aria-hidden className="pointer-events-none absolute inset-x-2 bottom-2 top-11 z-[2] grid place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--primary-soft)_80%,transparent)]">
                  <span className={cn(
                    'inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface px-[18px] py-2.5 text-center font-head text-[17px] font-semibold leading-[1.3] text-primary-text shadow-v2-2 transition-transform',
                    isOver && 'scale-105 bg-primary text-primary-foreground',
                  )}>
                    <ChevronRight aria-hidden className="size-4" />{t(DROP_LABEL[drag!.action])}
                  </span>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Bóng thẻ khi kéo */}
      {drag && (
        <div
          ref={ghostRef}
          aria-hidden
          className="pointer-events-none fixed z-[70] will-change-transform"
          style={{ left: drag.rect.left, top: drag.rect.top, width: drag.rect.width, transform: 'rotate(2deg)', transformOrigin: '40% 40%' }}
        >
          <div className="relative rounded-[10px] shadow-v2-pop ring-1 ring-primary">
            <BoardCard task={drag.task} currentUserId={currentUserId} role={role} canStar={canStar} dnd={false} ghost onAction={onAction} />
            {over && !flying && (
              <span className="absolute -top-3 right-2.5 inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground shadow-v2-2">
                {t(DROP_LABEL[drag.action])}
              </span>
            )}
          </div>
        </div>
      )}

      {columns.every((c) => !c.loading && c.tasks.length === 0) && !filteredEmpty && (
        <div className="mt-2 flex justify-center">
          <Button type="button" variant="outline" size="xs" onClick={onCreate}><Plus aria-hidden />{t('page.new')}</Button>
        </div>
      )}

      <p id="tb-dnd-instr" className="sr-only">{t('tbx.instr')}</p>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">{live}</div>
    </div>
  );
}

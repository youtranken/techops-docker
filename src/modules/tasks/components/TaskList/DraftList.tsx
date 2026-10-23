'use client';

/**
 * Tab "Nháp trên máy này" (Phase B) — preview `tasks-list.html` `renderDrafts`.
 * Nháp chỉ nằm trong localStorage của trình duyệt (draft-store.ts), không phải công việc: không mã, không gọi API.
 * Bấm nháp → ngăn Tạo việc có sẵn dữ liệu; ⋯ → Mở nháp · Mở trang đầy đủ (/tasks/new?draft=<id>) · Xóa nháp.
 */
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Info, Pencil, Maximize2, Trash2, FilePen } from 'lucide-react';
import { EmptyState } from '@/shared/ui/States';
import { QuickMenu } from '@/shared/ui/QuickMenu';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { fmtDateTime } from '../TaskDetail/ReportDialog';
import { removeDraft, type TaskDraft } from '../TaskForm/draft-store';
import { notifyDrafts } from '../TaskForm/useDrafts';

export function DraftList({ userId, drafts, onOpen }: { userId: string; drafts: TaskDraft[]; onOpen: (id: string) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const confirm = useConfirm();
  const title = (d: TaskDraft) => d.f.title.trim() || t('dr.untitled');

  async function del(d: TaskDraft) {
    const ok = await confirm({ title: t('dr.del.t'), description: t('dr.del.d'), confirmText: t('tf.draft.del'), danger: true });
    if (!ok) return;
    removeDraft(userId, d.id);
    notifyDrafts();
    toast.success(t('dr.toast.deleted'));
  }

  return (
    <div data-testid="draft-list">
      <p className="mb-3 flex items-center gap-2 text-[13px] text-ink-2">
        <Info aria-hidden className="size-4 flex-none text-ink-3" />
        <span>{t('dr.local')}.</span>
      </p>
      {drafts.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState icon={FilePen} title={t('dr.empty.t')} description={t('dr.empty.d')} />
        </div>
      ) : (
        <ul className="m-0 list-none overflow-hidden rounded-card border border-line bg-surface p-0">
          {drafts.map((d) => {
            const n = d.f.assigneeIds.length;
            return (
              <li key={d.id} className="flex items-center gap-2 border-t border-line pr-2.5 first:border-t-0" data-draft-id={d.id}>
                <button
                  type="button"
                  onClick={() => onOpen(d.id)}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 bg-transparent px-4 py-2.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring max-[680px]:min-h-11"
                >
                  <span className="truncate font-medium text-ink">{title(d)}</span>
                  <span className="flex flex-wrap gap-1.5 text-xs text-ink-3">
                    <span>{t('dr.saved', { w: fmtDateTime(new Date(d.ts), locale) })}</span>
                    {n > 0 && <><span aria-hidden>·</span><span>{t('tf.people.n', { n })}</span></>}
                  </span>
                </button>
                <QuickMenu
                  label={t('dr.menu._', { t: title(d) })}
                  triggerClassName="max-[680px]:size-11"
                  groups={[
                    [
                      { key: 'open', label: t('dr.menu.open'), icon: Pencil, onSelect: () => onOpen(d.id) },
                      { key: 'full', label: t('td.openFull'), icon: Maximize2, onSelect: () => router.push(`/tasks/new?draft=${encodeURIComponent(d.id)}`) },
                    ],
                    [{ key: 'del', label: t('tf.draft.del'), icon: Trash2, danger: true, onSelect: () => void del(d) }],
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

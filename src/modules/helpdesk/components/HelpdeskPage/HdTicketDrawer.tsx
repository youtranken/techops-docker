'use client';

/**
 * Ngăn chi tiết ticket (preview helpdesk `drawerHtml`, V1 TicketDetailSheet). Dữ liệu lấy từ dòng đang mở — không gọi API.
 * Chân ngăn (Boss/Admin, ticket chưa tạo việc): [Xoá] … [Tạo công việc] = 2 nút "Xóa" / "Gán người" của dòng V1.
 */
import * as React from 'react';
import { CheckCircle2, ChevronLeft, Trash2, ListChecks, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { KvGrid } from '@/shared/ui/KvGrid';
import { DialogNote } from '@/shared/ui/ActionDialog';
import { useFormat } from '@/i18n/useFormat';
import type { HelpdeskPendingItem } from '../../types';
import { fmtDateTime, rowFlags } from './hd-logic';
import { HdFlag, HdStatus } from './HdCells';

const iconBtn = 'grid size-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function HdTicketDrawer({ item, canManage, onClose, onCreate, onDelete }: {
  item: HelpdeskPendingItem | null;
  canManage: boolean;
  onClose: () => void;
  onCreate: (it: HelpdeskPendingItem) => void;
  onDelete: (it: HelpdeskPendingItem) => void;
}) {
  const t = useTranslations();
  // giữ ticket cuối để nội dung không biến mất khi ngăn trượt ra
  const [shown, setShown] = React.useState(item);
  React.useEffect(() => { if (item) setShown(item); }, [item]);
  const it = item ?? shown;

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" aria-describedby={undefined} data-testid="hd-drawer"
        className="v2-drawer flex w-full flex-col gap-0 border-0 bg-surface p-0 sm:max-w-[520px] max-[680px]:max-w-none">
        <header className="flex h-14 flex-none items-center gap-1 border-b border-line pl-4 pr-3 max-[680px]:pl-3 max-[680px]:pr-2">
          <button type="button" onClick={onClose} className="-ml-1.5 hidden h-11 items-center gap-1 rounded-md pl-1 pr-2.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-[680px]:inline-flex">
            <ChevronLeft aria-hidden className="size-5" />{t('td.back')}
          </button>
          <span className="flex-1" />
          <button type="button" onClick={onClose} className={`${iconBtn} max-[680px]:hidden`} aria-label={t('app.close')}>
            <X aria-hidden className="size-5" />
          </button>
        </header>
        {it ? <Body it={it} canManage={canManage} onCreate={onCreate} onDelete={onDelete} /> : <SheetTitle className="sr-only">{t('hd.dr.label')}</SheetTitle>}
      </SheetContent>
    </Sheet>
  );
}

function Body({ it, canManage, onCreate, onDelete }: { it: HelpdeskPendingItem; canManage: boolean; onCreate: (it: HelpdeskPendingItem) => void; onDelete: (it: HelpdeskPendingItem) => void }) {
  const t = useTranslations();
  const f = useFormat();
  const fl = rowFlags(it);
  const none = <span className="text-ink-3">—</span>;
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-5 max-[680px]:px-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-3">
          <span className="font-mono text-[13px] text-ink-2">{it.hdId}</span><span>· {t('hd.src')}</span>
        </div>
        <SheetTitle className="m-0 mb-4 font-head text-lg font-semibold leading-snug text-ink [overflow-wrap:anywhere]">{it.tieuDe}</SheetTitle>
        {fl.pushed && <DialogNote icon={CheckCircle2} className="mb-5">{t('hdx.note.pushed')}</DialogNote>}
        {fl.attention && <DialogNote tone="bad" className="mb-5">{t(canManage ? 'hd.note.attnBoss' : 'hd.note.attn')}</DialogNote>}
        <div className="overflow-hidden rounded-card border border-line">
          <KvGrid items={[
            { key: 'st', label: t('hd.col.status'), value: <HdStatus raw={it.trangThai} strong /> },
            { key: 'pr', label: t('filter.priority'), value: <HdFlag raw={it.uuTien} withLabel /> },
            { key: 'rq', label: t('hd.kv.req'), value: it.nhanVien || none, hint: it.phongBan || undefined },
            { key: 'ty', label: t('hd.kv.type'), value: it.loaiYeuCau || none },
            { key: 'it', label: t('hd.kv.it'), value: it.itSupport ?? <span className="text-ink-3">{t('hd.it.none')}</span> },
            { key: 'tk', label: t('hd.kv.task'), value: fl.pushed ? <span style={{ color: 'var(--c-done)' }}>{t('hd.view.pushed')}</span> : <span className="text-ink-3">{t('hd.kv.noTask')}</span> },
            { key: 'cr', label: t('hd.kv.created'), value: <span className="font-mono text-[13px]">{fmtDateTime(it.thoiGian, f.locale) || '—'}</span> },
            { key: 'dn', label: t('hd.kv.done'), value: fl.completed && it.ngayHoanThanh ? <span className="font-mono text-[13px]">{fmtDateTime(it.ngayHoanThanh, f.locale)}</span> : none },
          ]} />
        </div>
        {it.dienGiai && (
          <section className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{t('hd.kv.desc')}</h3>
            <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">{it.dienGiai}</p>
          </section>
        )}
        <section className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{t('hd.kv.sync')}</h3>
          <div className="overflow-hidden rounded-card border border-line">
            <KvGrid items={[
              { key: 'im', label: t('hd.kv.imp'), value: <span className="font-mono text-[13px]">{fmtDateTime(it.createdAt, f.locale)}</span> },
              { key: 'up', label: t('hd.kv.upd'), value: <span className="font-mono text-[13px]">{fmtDateTime(it.updatedAt, f.locale)}</span> },
            ]} />
          </div>
        </section>
      </div>
      {canManage && !fl.pushed && (
        <footer className="flex flex-none items-center gap-2 border-t border-line px-4 py-3 max-[680px]:pb-[max(12px,env(safe-area-inset-bottom))]">
          <Button type="button" variant="neg" size="md" onClick={() => onDelete(it)} data-testid="hd-dr-del" className="max-[680px]:h-11">
            <Trash2 aria-hidden />{t('hd.act.del')}
          </Button>
          <span className="flex-1" />
          <Button type="button" size="md" onClick={() => onCreate(it)} data-testid="hd-dr-create" className="max-[680px]:h-11">
            <ListChecks aria-hidden />{t('hd.act.create')}
          </Button>
        </footer>
      )}
    </>
  );
}

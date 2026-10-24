'use client';

/** Thanh hàng loạt (preview `.bulk`): "Đã chọn n ticket" · Gán người · Xoá · Bỏ chọn. Chỉ Boss/Admin (API V1 ADMIN+BOSS).
 *  "Tạo công việc" cho riêng ticket đã chọn là Phase B (V1 chỉ có "Đẩy tất cả") → không hiện. */
import { Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function HdBulkBar({ count, busy, onAssign, onDelete, onClear }: {
  count: number; busy: boolean; onAssign: () => void; onDelete: () => void; onClear: () => void;
}) {
  const t = useTranslations();
  if (!count) return null;
  return (
    <div role="region" aria-label={t('hd.bulk.label')} data-testid="hd-bulk"
      className="mb-3 flex flex-wrap items-center gap-2 rounded-ctl bg-primary-soft py-2 pl-4 pr-2.5 text-[13px] max-[680px]:px-2.5">
      <b role="status" className="mr-auto font-semibold text-ink max-[680px]:basis-full">{t('hd.bulk.n', { n: count })}</b>
      <Button type="button" variant="outline" size="xs" onClick={onAssign} disabled={busy} data-testid="hd-bulk-assign" className="max-[680px]:h-11 max-[680px]:flex-1">
        <Users aria-hidden />{t('hd.act.assign')}
      </Button>
      <Button type="button" variant="neg" size="xs" onClick={onDelete} disabled={busy} data-testid="hd-bulk-del" className="max-[680px]:h-11 max-[680px]:flex-1">
        <Trash2 aria-hidden />{t('hd.act.del')}
      </Button>
      <button type="button" onClick={onClear} className="rounded-md px-2 py-1 font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-11">
        {t('hd.bulk.clear')}
      </button>
    </div>
  );
}

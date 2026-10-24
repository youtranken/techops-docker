'use client';

/**
 * Mục "Chung" — /settings/general (preview `pGeneral`). Route mồ côi V1 (không có trong menu), CHỜ chủ dự án quyết định:
 * giữ đúng V1 — chọn múi giờ hệ thống, PUT { timezone } (chỉ Admin), có hiệu lực sau khi khởi động lại máy chủ.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Field, controlClass } from '@/shared/ui/Field';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { cn } from '@/lib/utils';
import { useGeneralConfig, useUpdateGeneralConfig } from '../../hooks/useGeneralConfig';
import { Dot, FormSkeleton, HeadTag, NoAccess, Note, PanelError, PanelHead, SettingsBlock, httpStatus } from '../shell/parts';
import { useReportDirty } from '../shell/SettingsDirty';

/** Đúng danh sách + thứ tự V1 (GeneralSection.TIMEZONES; route chỉ nhận các giá trị này) */
const TIMEZONES: [string, string][] = [
  ['Asia/Bangkok', '+7'], ['Asia/Ho_Chi_Minh', '+7'], ['Asia/Singapore', '+8'], ['Asia/Kuala_Lumpur', '+8'], ['Asia/Manila', '+8'],
  ['Asia/Jakarta', '+7'], ['Asia/Tokyo', '+9'], ['Asia/Seoul', '+9'], ['Asia/Shanghai', '+8'], ['Asia/Kolkata', '+5:30'],
  ['Asia/Dubai', '+4'], ['Europe/London', '+0/+1'], ['Europe/Paris', '+1/+2'], ['UTC', '+0'], ['America/New_York', '−5/−4'],
  ['America/Los_Angeles', '−8/−7'],
];

export function GeneralPage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const { data, isLoading, error, refetch } = useGeneralConfig();
  const update = useUpdateGeneralConfig();
  const [base, setBase] = React.useState<string | null>(null);
  const [tz, setTz] = React.useState<string | null>(null);
  const dirty = base !== null && tz !== null && base !== tz;
  useReportDirty(dirty);

  React.useEffect(() => {
    if (!data || update.isPending) return;
    setBase(data.timezone);
    setTz(data.timezone);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!tz) return;
    try {
      const saved = await update.mutateAsync({ timezone: tz });
      setBase(saved.timezone);
      setTz(saved.timezone);
      toast.success(t('set.saved.restart'));
    } catch (err) {
      toast.error(errMsg(err, 'Lỗi không xác định'));
    }
  }

  const tags = (
    <>
      <HeadTag icon={Lock}>{t('set.adminOnly')}</HeadTag>
      <Dot tone="review">{t('set.pending._')}</Dot>
    </>
  );
  if (httpStatus(error) === 403) {
    return <section aria-labelledby="set-panel-title"><PanelHead title={t('set.s.general')} description={t('set.d.general')} tags={tags} /><NoAccess adminOnly /></section>;
  }
  const known = TIMEZONES.some(([z]) => z === tz);

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead title={t('set.s.general')} description={t('set.d.general')} tags={tags} />
      <Note>{t('set.gen.pendingNote')}</Note>
      {isLoading ? <FormSkeleton blocks={1} /> : error || tz === null ? <PanelError onRetry={() => refetch()} /> : (
        <div data-testid="gen-form">
          <SettingsBlock id="gen-tz" title={t('set.gen.tzT')}>
            <Field id="gen-timezone" label={t('set.gen.tz')} optional={false} hint={t('set.gen.tzH')} className="max-w-[420px]">
              <select className={cn(controlClass, 'h-[38px] max-[680px]:h-11')} value={tz} onChange={(e) => setTz(e.target.value)}>
                {!known && <option value={tz}>{tz}</option>}
                {TIMEZONES.map(([z, off]) => (
                  <option key={z} value={z}>{`UTC${off} · ${z}`}{z === 'Asia/Ho_Chi_Minh' ? ` (${t('set.gen.legacy')})` : ''}</option>
                ))}
              </select>
            </Field>
          </SettingsBlock>
          <StickySaveBar dirty={dirty} saving={update.isPending} onSave={save} onReset={() => setTz(base)} message={t('set.dirty')} saveText={t('set.save')} resetText={t('set.undo')} />
        </div>
      )}
    </section>
  );
}

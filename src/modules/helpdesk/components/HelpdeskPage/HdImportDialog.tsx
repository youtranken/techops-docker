'use client';

/**
 * "Nhập dữ liệu Helpdesk" (preview `dlgImport`) — gắn lại ManualImportCard + nút "Get từ API" của V1 vào 1 hộp thoại 2 bước:
 *   Chọn nguồn → Kết quả. Bấm là NHẬP NGAY như V1 (không có bước Xem trước — chạy thử cần API mới → Phase B).
 * - Helpdesk API: POST /sync không body (server gọi Helpdesk, chỉ lấy ticket năm nay).
 * - Dán JSON: luật V1 — rỗng / JSON lỗi thì không gửi; gửi nguyên { manualData } (server kiểm dạng, tối đa 500).
 */
import * as React from 'react';
import { CheckCircle2, ChevronLeft, FileJson, Loader2, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, textareaClass } from '@/shared/ui/Field';
import { PhaseBBadge } from '@/shared/ui/PhaseBBadge';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { cn } from '@/lib/utils';
import type { SyncResult } from '../../types';
import { useHelpdeskSync } from '../../hooks/useHelpdeskSync';
import { parseImport, type ImportBody } from './hd-logic';
import { useCounts } from './HdSyncBar';

type Step = 'src' | 'run' | 'done' | 'fail';
const PLACEHOLDER = '[{ "Code": "260860", "Tiêu đề": "…", "Trạng thái": "Hoàn thành", "IT Support": "…" }]';
const DEV = process.env.NODE_ENV !== 'production';

export function HdImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const counts = useCounts();
  const sync = useHelpdeskSync();
  const [step, setStep] = React.useState<Step>('src');
  const [src, setSrc] = React.useState<'api' | 'json'>('api');
  const [json, setJson] = React.useState('');
  const [jsonErr, setJsonErr] = React.useState<'empty' | 'json' | null>(null);
  const [res, setRes] = React.useState<SyncResult | null>(null);
  const [fail, setFail] = React.useState('');
  const lastBody = React.useRef<ImportBody | undefined>(undefined);

  React.useEffect(() => {
    if (!open) return;
    setStep('src'); setSrc('api'); setJson(''); setJsonErr(null); setRes(null); setFail('');
  }, [open]);

  const run = (body: ImportBody | undefined) => {
    lastBody.current = body;
    setStep('run');
    sync.mutate(body, {
      onSuccess: (r) => {
        setRes(r); setStep('done');
        toast.success(t('hd.toast.imported', { r: counts({ ...r, errors: r.errors.length }) }));
        if (body !== undefined) setJson(''); // V1: nhập xong xoá ô JSON
      },
      onError: (e) => { setFail(errMsg(e)); setStep('fail'); },
    });
  };

  const onOk = () => {
    if (step === 'fail') { run(lastBody.current); return; }
    if (src === 'api') { run(undefined); return; }
    const p = parseImport(json);
    if (!p.ok) { setJsonErr(p.error); document.getElementById('hd-imp-json')?.focus(); return; }
    run(p.body);
  };

  const steps = (
    <ol aria-label={t('hd.imp.steps')} className="m-0 mb-4 mt-0.5 flex list-none flex-wrap gap-1.5 p-0 text-xs text-ink-3">
      {(['src', 'done'] as const).map((s, i) => {
        const cur = step === 'done' ? 1 : 0;
        return (
          <li key={s} aria-current={i === cur ? 'step' : undefined} className={cn('flex items-center gap-1.5', i > 0 && 'before:h-px before:w-4 before:bg-line-2', i === cur && 'font-medium text-ink')}>
            <span className={cn('grid size-5 place-items-center rounded-full border font-mono text-[11px]', i === cur ? 'border-primary text-primary-text' : i < cur ? 'border-surface-2 bg-surface-2 text-ink-2' : 'border-line-2')}>{i < cur ? '✓' : i + 1}</span>
            {t(s === 'src' ? 'hd.imp.s1' : 'hd.imp.s3')}
          </li>
        );
      })}
    </ol>
  );

  const radio = (v: 'api' | 'json', title: string, desc: string) => (
    <label className={cn('flex min-w-0 cursor-pointer items-start gap-2.5 rounded-ctl border border-line-2 p-3', src === v && 'border-primary shadow-[0_0_0_1px_var(--primary)]')}>
      <input type="radio" name="hd-imp-src" value={v} checked={src === v} onChange={() => { setSrc(v); setJsonErr(null); }} className="mt-[3px] flex-none accent-[var(--primary)]" />
      <span className="min-w-0"><b className="block text-sm font-medium text-ink">{title}</b><small className="mt-0.5 block text-xs leading-[1.45] text-ink-3">{desc}</small></span>
    </label>
  );

  let body: React.ReactNode;
  if (step === 'src') {
    body = (
      <>
        <fieldset className="m-0 mb-4 border-0 p-0">
          <legend className="mb-1.5 p-0 text-[13px] font-medium text-ink">{t('hd.imp.srcL')}</legend>
          <div className="grid grid-cols-2 gap-2.5 max-[680px]:grid-cols-1">
            {radio('api', t('hd.imp.api'), t('hd.imp.apiD'))}
            {radio('json', t('hd.imp.json'), t('hd.imp.jsonD'))}
          </div>
        </fieldset>
        {src === 'json' ? (
          <Field id="hd-imp-json" label={t('hd.imp.jsonL')} required hint={t('hdx.imp.jsonH')}
            error={jsonErr ? t(jsonErr === 'empty' ? 'hd.imp.e.empty' : 'hd.imp.e.json') : undefined}>
            <textarea rows={8} spellCheck={false} value={json} placeholder={PLACEHOLDER}
              onChange={(e) => { setJson(e.target.value); if (jsonErr) setJsonErr(null); }}
              className={cn(textareaClass, 'min-h-[170px] font-mono text-xs leading-[1.55]')} />
          </Field>
        ) : (
          <DialogNote>{t('hd.imp.apiNoteV1')}</DialogNote>
        )}
        {DEV && <p className="!mb-0 mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-3">{t('hd.imp.bNote')}<PhaseBBadge /></p>}
      </>
    );
  } else if (step === 'run') {
    body = (
      <div role="status" className="flex flex-col items-center gap-2.5 px-2 py-7 text-center text-[13px] text-ink-2">
        <Loader2 aria-hidden className="size-7 animate-spin text-primary-text motion-reduce:animate-none" />
        <b className="text-sm font-medium text-ink">{t(src === 'api' ? 'hd.imp.fetching' : 'hd.imp.running')}</b>
        <span>{t(src === 'api' ? 'hd.imp.fetchingV1' : 'hd.imp.runningD')}</span>
      </div>
    );
  } else if (step === 'fail') {
    body = (
      <>
        <DialogNote tone="bad" icon={src === 'api' ? WifiOff : undefined}>
          <b className="font-semibold">{t(src === 'api' ? 'hd.imp.apiErrT' : 'hdx.imp.failT')}</b><br />
          {t(src === 'api' ? 'hd.imp.apiErrD' : 'hdx.imp.failD')}
        </DialogNote>
        <p className="!mb-1.5 mt-3 text-xs text-ink-3">{t('hd.imp.errDetail')}</p>
        <div className="mb-3.5 rounded-ctl bg-surface-2 px-3 py-2.5 font-mono text-xs text-ink-2 [overflow-wrap:anywhere]" data-testid="hd-imp-err">{fail}</div>
        {src === 'api' && (
          <Button type="button" variant="outline" size="xs" onClick={() => { setSrc('json'); setStep('src'); }}>
            <FileJson aria-hidden />{t('hd.imp.useJson')}
          </Button>
        )}
      </>
    );
  } else if (res) {
    const row = (color: string, title: string, desc: string, v: number) => (
      <li className="flex items-center gap-2.5 border-b border-line px-3 py-2.5 text-[13px] text-ink-2 last:border-b-0">
        <span aria-hidden className="mx-0.5 size-2 flex-none rounded-full" style={{ background: color }} />
        <span className="min-w-0 flex-1"><b className="block text-sm font-medium text-ink">{title}</b>{desc}</span>
        <span className="font-mono text-sm font-medium text-ink">{v}</span>
      </li>
    );
    body = (
      <>
        <DialogNote icon={CheckCircle2} className="mb-3.5">{t('hd.imp.doneT')}</DialogNote>
        <ul className="m-0 mb-3.5 list-none rounded-ctl border border-line p-0" data-testid="hd-imp-sum">
          {row('var(--c-done)', t('hd.imp.r.new'), t('hd.imp.r.newD'), res.synced)}
          {row('var(--c-review)', t('hd.imp.r.wait'), t('hd.imp.r.waitD'), res.pending)}
          {row('var(--c-draft)', t('hd.imp.r.dup'), t('hd.imp.r.dupD'), res.skipped)}
          {res.errors.length > 0 && row('var(--danger)', t('hd.imp.r.err'), '', res.errors.length)}
        </ul>
        {res.errors.length > 0 && (
          <ul aria-label={t('hdx.imp.errList')} className="m-0 flex list-none flex-col gap-1 p-0">
            {res.errors.map((e, i) => (
              <li key={i} className="rounded-sm bg-surface-2 px-2.5 py-1.5 text-xs text-ink-2 [overflow-wrap:anywhere]">
                <span className="font-mono text-ink">{e.hdId ?? e.code}</span> — {e.message}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const okLabel = step === 'done' ? undefined : step === 'fail' ? t('app.retry') : t(src === 'api' ? 'hd.imp.runApi' : 'hd.imp.runJson');
  return (
    <ActionDialog open={open} onClose={onClose} size="lg" title={t('hd.imp.title')} data-testid="hd-imp-dlg"
      okLabel={okLabel} onOk={onOk} pending={step === 'run'}
      extraActions={step === 'fail' ? (
        <Button type="button" variant="subtle" size="md" onClick={() => setStep('src')} className="min-[681px]:mr-auto min-[681px]:order-first">
          <ChevronLeft aria-hidden />{t('hd.imp.back')}
        </Button>
      ) : undefined}>
      {steps}
      {body}
    </ActionDialog>
  );
}

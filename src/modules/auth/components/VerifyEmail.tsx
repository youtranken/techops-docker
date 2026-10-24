'use client';

/**
 * Kết quả xác nhận email (preview password.html?mode=verify). API V1 GET /api/auth/verify-email xử lý token
 * rồi chuyển về /verify-email?success=1 | ?error=missing_token|invalid_or_expired|email_changed. Nút về "/" như V1.
 */
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock, Mail, XCircle } from 'lucide-react';
import { verifyState } from '../lib/auth-logic';
import { AuthResult, ResultLink } from './AuthResult';

export function VerifyEmail() {
  const t = useTranslations();
  const s = verifyState(useSearchParams());
  const home = <ResultLink href="/" primary>{t('aux.toHome')}</ResultLink>;
  if (s === 'busy') return <AuthResult tone="busy" title={t('au.vf.busy.t')} desc={t('au.vf.busy.d')} testId="vf-busy" />;
  if (s === 'ok') return <AuthResult tone="ok" icon={CheckCircle2} title={t('au.vf.ok.t')} desc={t('aux.vf.ok.d')} testId="vf-ok">{home}</AuthResult>;
  if (s === 'missing') return <AuthResult tone="bad" icon={XCircle} title={t('au.vf.missing.t')} desc={t('au.vf.missing.d')} testId="vf-missing">{home}</AuthResult>;
  if (s === 'expired') return <AuthResult tone="warn" icon={Clock} title={t('au.vf.expired.t')} desc={t('au.vf.expired.d')} testId="vf-expired">{home}</AuthResult>;
  if (s === 'changed') return <AuthResult tone="warn" icon={Mail} title={t('au.vf.changed.t')} desc={t('au.vf.changed.d')} testId="vf-changed">{home}</AuthResult>;
  return <AuthResult tone="bad" icon={XCircle} title={t('aux.vf.unknown.t')} desc={t('aux.vf.unknown.d')} testId="vf-unknown">{home}</AuthResult>;
}

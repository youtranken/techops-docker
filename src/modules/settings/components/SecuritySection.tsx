'use client';

import { useState, useEffect } from 'react';
import { Shield, RotateCcw, Save, Loader2, AlertCircle } from 'lucide-react';
import { useSecurityConfig } from '../hooks/useSecurityConfig';
import type { SecurityConfig } from '../types';
import { SecurityRateLimitCard } from './SecurityRateLimitCard';
import { SecurityPasswordCard } from './SecurityPasswordCard';
import { SecuritySessionCard } from './SecuritySessionCard';

export function SecuritySection() {
  const { config, isLoading, update, reset, isUpdating, isResetting } = useSecurityConfig();
  const [draft, setDraft] = useState<SecurityConfig | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (config && !isDirty) {
      setDraft(config);
    }
  }, [config, isDirty]);

  const hasChanges = isDirty && draft !== null && JSON.stringify(config) !== JSON.stringify(draft);

  const updateDraft = <K extends keyof SecurityConfig, T extends keyof SecurityConfig[K]>(
    section: K,
    field: T,
    value: SecurityConfig[K][T],
  ) => {
    if (!draft) return;
    setIsDirty(true);
    setDraft({ ...draft, [section]: { ...draft[section], [field]: value } });
  };

  const handleSave = () => {
    if (!draft) return;
    update(draft, { onSuccess: () => setIsDirty(false) });
  };

  const handleReset = () => {
    setIsDirty(false);
    reset();
  };

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Cấu hình Bảo mật
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý chính sách bảo mật, giới hạn truy cập và phiên làm việc
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Lưu ý quan trọng</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Thay đổi cấu hình bảo mật có thể ảnh hưởng đến tất cả người dùng.
            Các giới hạn quá nghiêm ngặt có thể gây khó khăn cho việc đăng nhập.
          </p>
        </div>
      </div>

      <SecurityRateLimitCard
        value={draft.rateLimit}
        onChange={(field, val) => updateDraft('rateLimit', field, val)}
      />

      <SecurityPasswordCard
        value={draft.passwordPolicy}
        onChange={(field, val) => updateDraft('passwordPolicy', field, val)}
      />

      <SecuritySessionCard
        value={draft.session}
        onChange={(field, val) => updateDraft('session', field, val)}
      />

      <div className="flex items-center gap-3 pt-2 pb-4 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isUpdating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Đặt lại mặc định
        </button>

        {hasChanges && (
          <span className="text-xs text-muted-foreground ml-2">Bạn có thay đổi chưa lưu</span>
        )}
      </div>
    </div>
  );
}

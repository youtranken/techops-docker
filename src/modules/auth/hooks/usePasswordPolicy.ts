'use client';

import { useEffect, useState } from 'react';
import type { PasswordPolicyConfig } from '@/modules/settings/types';
import { DEFAULT_POLICY } from '@/modules/settings/lib/password-rules';

/** GET /api/auth/password-policy (public, V1). Lỗi → chính sách mặc định như V1. `null` = đang tải. */
export function usePasswordPolicy() {
  const [policy, setPolicy] = useState<PasswordPolicyConfig | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/password-policy')
      .then((r) => r.json())
      .then((d) => { if (alive) setPolicy(d.policy ?? DEFAULT_POLICY); })
      .catch(() => { if (alive) setPolicy(DEFAULT_POLICY); });
    return () => { alive = false; };
  }, []);
  return policy;
}

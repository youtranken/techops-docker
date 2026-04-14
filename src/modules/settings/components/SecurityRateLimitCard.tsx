'use client';

import { Shield } from 'lucide-react';
import type { RateLimitConfig } from '../types';
import { SecurityCard } from './SecurityCard';
import { SecurityFormField } from './SecurityFormField';
import { Toggle, NumberInput } from './SecurityControls';

interface Props {
  value: RateLimitConfig;
  onChange: <T extends keyof RateLimitConfig>(field: T, val: RateLimitConfig[T]) => void;
}

export function SecurityRateLimitCard({ value, onChange }: Props) {
  return (
    <SecurityCard
      icon={Shield}
      title="Giới hạn Tốc độ (Rate Limiting)"
      description="Bảo vệ hệ thống khỏi các cuộc tấn công brute force bằng cách giới hạn số lần thử đăng nhập và request API"
    >
      <SecurityFormField
        label="Giới hạn đăng nhập"
        description="Số lần thử đăng nhập tối đa trong khoảng thời gian"
        helpText="Khuyến nghị: 5-10 lần để cân bằng giữa bảo mật và trải nghiệm người dùng"
      >
        <NumberInput
          value={value.loginMaxAttempts}
          onChange={(val) => onChange('loginMaxAttempts', val)}
          min={3}
          max={20}
          unit="lần"
        />
      </SecurityFormField>

      <SecurityFormField
        label="Thời gian chặn đăng nhập"
        description="Thời gian tạm khóa sau khi vượt giới hạn"
        helpText="Tài khoản sẽ bị khóa tạm thời sau khi vượt quá số lần đăng nhập cho phép"
      >
        <NumberInput
          value={value.lockoutMinutes}
          onChange={(val) => onChange('lockoutMinutes', val)}
          min={5}
          max={60}
          unit="phút"
        />
      </SecurityFormField>

      <SecurityFormField
        label="Giới hạn API request"
        description="Số request tối đa mỗi phút cho mỗi IP"
        helpText="Áp dụng cho tất cả API endpoints. Giá trị thấp hơn = bảo mật cao hơn nhưng có thể ảnh hưởng hiệu năng"
      >
        <NumberInput
          value={value.maxRequests}
          onChange={(val) => onChange('maxRequests', val)}
          min={10}
          max={1000}
          unit="req/min"
        />
      </SecurityFormField>

      <SecurityFormField
        label="Bật Rate Limiting"
        description="Kích hoạt giới hạn tốc độ cho toàn hệ thống"
        helpText="Tắt chức năng này chỉ nên dùng cho môi trường development"
      >
        <Toggle checked={value.enabled} onChange={(val) => onChange('enabled', val)} />
      </SecurityFormField>
    </SecurityCard>
  );
}

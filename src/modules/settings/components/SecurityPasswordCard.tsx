'use client';

import { Key } from 'lucide-react';
import type { PasswordPolicyConfig } from '../types';
import { SecurityCard } from './SecurityCard';
import { SecurityFormField } from './SecurityFormField';
import { Toggle, NumberInput } from './SecurityControls';

interface Props {
  value: PasswordPolicyConfig;
  onChange: <T extends keyof PasswordPolicyConfig>(field: T, val: PasswordPolicyConfig[T]) => void;
}

export function SecurityPasswordCard({ value, onChange }: Props) {
  return (
    <SecurityCard
      icon={Key}
      title="Chính sách Mật khẩu"
      description="Đặt quy tắc bắt buộc cho mật khẩu để đảm bảo tính bảo mật cao"
    >
      <SecurityFormField
        label="Độ dài tối thiểu"
        description="Số ký tự tối thiểu trong mật khẩu"
        helpText="Khuyến nghị: 8-12 ký tự cho độ bảo mật tốt"
      >
        <NumberInput
          value={value.minLength}
          onChange={(val) => onChange('minLength', val)}
          min={6}
          max={32}
          unit="ký tự"
        />
      </SecurityFormField>

      <SecurityFormField
        label="Yêu cầu chữ hoa"
        description="Mật khẩu phải chứa ít nhất 1 chữ in hoa"
        helpText="Ví dụ: A, B, C... giúp tăng độ phức tạp"
      >
        <Toggle checked={value.requireUppercase} onChange={(val) => onChange('requireUppercase', val)} />
      </SecurityFormField>

      <SecurityFormField
        label="Yêu cầu chữ thường"
        description="Mật khẩu phải chứa ít nhất 1 chữ in thường"
        helpText="Ví dụ: a, b, c... kết hợp với chữ hoa tạo mật khẩu mạnh hơn"
      >
        <Toggle checked={value.requireLowercase} onChange={(val) => onChange('requireLowercase', val)} />
      </SecurityFormField>

      <SecurityFormField
        label="Yêu cầu số"
        description="Mật khẩu phải chứa ít nhất 1 chữ số"
        helpText="Ví dụ: 0, 1, 2, 3... tăng độ phức tạp"
      >
        <Toggle checked={value.requireNumber} onChange={(val) => onChange('requireNumber', val)} />
      </SecurityFormField>

      <SecurityFormField
        label="Yêu cầu ký tự đặc biệt"
        description="Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt"
        helpText="Ví dụ: !@#$%^&*... giúp mật khẩu khó đoán hơn"
      >
        <Toggle checked={value.requireSpecialChar} onChange={(val) => onChange('requireSpecialChar', val)} />
      </SecurityFormField>

      <SecurityFormField
        label="Mật khẩu hết hạn sau (ngày)"
        description="Mật khẩu hết hạn sau N ngày tính từ lần đổi cuối (0 = không hết hạn)"
        helpText="Khuyến nghị 60-90 ngày. Hệ thống tự gửi email reset link 3 ngày trước hết hạn. Hết hạn sẽ buộc đổi khi đăng nhập."
      >
        <NumberInput
          value={value.expiryDays}
          onChange={(val) => onChange('expiryDays', val)}
          min={0}
          max={365}
          unit="ngày"
        />
      </SecurityFormField>
    </SecurityCard>
  );
}

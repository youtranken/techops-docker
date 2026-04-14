'use client';

import { Clock } from 'lucide-react';
import type { SessionConfig } from '../types';
import { SecurityCard } from './SecurityCard';
import { SecurityFormField } from './SecurityFormField';
import { Toggle, NumberInput } from './SecurityControls';

interface Props {
  value: SessionConfig;
  onChange: <T extends keyof SessionConfig>(field: T, val: SessionConfig[T]) => void;
}

export function SecuritySessionCard({ value, onChange }: Props) {
  return (
    <SecurityCard
      icon={Clock}
      title="Quản lý Phiên làm việc"
      description="Cấu hình timeout và giới hạn thời gian đăng nhập"
    >
      <SecurityFormField
        label="Timeout không hoạt động"
        description="Tự động đăng xuất khi không có hoạt động"
        helpText="Người dùng sẽ bị đăng xuất nếu không thao tác trong khoảng thời gian này"
      >
        <NumberInput
          value={value.idleTimeoutMinutes}
          onChange={(val) => onChange('idleTimeoutMinutes', val)}
          min={5}
          max={1440}
          unit="phút"
        />
      </SecurityFormField>

      <SecurityFormField
        label="Thời gian session tối đa"
        description="Bắt buộc đăng nhập lại sau khoảng thời gian"
        helpText="Kể cả khi đang hoạt động, phiên sẽ hết hạn sau thời gian này"
      >
        <NumberInput
          value={value.maxSessionHours}
          onChange={(val) => onChange('maxSessionHours', val)}
          min={1}
          max={168}
          unit="giờ"
        />
      </SecurityFormField>

      <SecurityFormField
        label="Cho phép nhiều session"
        description="Đăng nhập từ nhiều thiết bị cùng lúc"
        helpText="Tắt để chỉ cho phép đăng nhập 1 thiết bị tại một thời điểm (bảo mật cao hơn)"
      >
        <Toggle checked={value.allowMultipleSessions} onChange={(val) => onChange('allowMultipleSessions', val)} />
      </SecurityFormField>
    </SecurityCard>
  );
}

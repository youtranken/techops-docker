'use client';

import { useState, useEffect } from 'react';
import { Globe, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';

const TIMEZONES = [
  { value: 'Asia/Bangkok',        label: 'Asia/Bangkok (UTC+7) — Việt Nam / Thái Lan' },
  { value: 'Asia/Ho_Chi_Minh',   label: 'Asia/Ho_Chi_Minh (UTC+7) — Việt Nam (legacy)' },
  { value: 'Asia/Singapore',      label: 'Asia/Singapore (UTC+8)' },
  { value: 'Asia/Kuala_Lumpur',   label: 'Asia/Kuala_Lumpur (UTC+8)' },
  { value: 'Asia/Manila',         label: 'Asia/Manila (UTC+8) — Philippines' },
  { value: 'Asia/Jakarta',        label: 'Asia/Jakarta (UTC+7) — Indonesia' },
  { value: 'Asia/Tokyo',          label: 'Asia/Tokyo (UTC+9) — Nhật Bản' },
  { value: 'Asia/Seoul',          label: 'Asia/Seoul (UTC+9) — Hàn Quốc' },
  { value: 'Asia/Shanghai',       label: 'Asia/Shanghai (UTC+8) — Trung Quốc' },
  { value: 'Asia/Kolkata',        label: 'Asia/Kolkata (UTC+5:30) — Ấn Độ' },
  { value: 'Asia/Dubai',          label: 'Asia/Dubai (UTC+4)' },
  { value: 'Europe/London',       label: 'Europe/London (UTC+0/+1)' },
  { value: 'Europe/Paris',        label: 'Europe/Paris (UTC+1/+2)' },
  { value: 'UTC',                 label: 'UTC (UTC+0)' },
  { value: 'America/New_York',    label: 'America/New_York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8/-7)' },
];

export function GeneralSection() {
  const errMsg = useErrorMessage();
  const [timezone, setTimezone] = useState('Asia/Bangkok');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/general')
      .then((r) => r.json())
      .then((data) => {
        if (data.timezone) setTimezone(data.timezone);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Lỗi không xác định');
      }
      toast.success('Cài đặt chung đã được cập nhật. Thay đổi có hiệu lực sau khi khởi động lại server.');
    } catch (e) {
      toast.error(errMsg(e, 'Lỗi không xác định'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Cài đặt chung
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Cấu hình múi giờ và các thiết lập hệ thống toàn cục.</p>
      </div>

      <div className="bg-card border rounded-xl p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="timezone">Múi giờ hệ thống</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="w-full max-w-sm">
              <SelectValue placeholder="Chọn múi giờ..." />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Múi giờ này ảnh hưởng đến cron job, email nhắc nhở và hiển thị thời gian trong hệ thống.
            Thay đổi có hiệu lực sau khi khởi động lại server.
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        </div>
      </div>
    </div>
  );
}

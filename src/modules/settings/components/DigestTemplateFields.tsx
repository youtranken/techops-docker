'use client';

import { useState } from 'react';
import { Loader2, Send, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSendTestDigest } from '../hooks/useDigestConfig';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';

interface Props {
  emailSubject: string;
  emailGreeting: string;
  onChange: (field: 'emailSubject' | 'emailGreeting', value: string) => void;
}

export function DigestTemplateFields({ emailSubject, emailGreeting, onChange }: Props) {
  const errMsg = useErrorMessage();
  const [testEmail, setTestEmail] = useState('');
  const sendTest = useSendTestDigest();

  async function handleSendTest() {
    if (!testEmail.trim()) { toast.error('Nhập email nhận thử'); return; }
    try {
      const result = await sendTest.mutateAsync(testEmail.trim());
      toast.success(result.message);
      setTestEmail('');
    } catch (err: unknown) {
      toast.error(errMsg(err, 'Lỗi khi gửi'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tiêu đề email</label>
        <input
          type="text"
          value={emailSubject}
          onChange={(e) => onChange('emailSubject', e.target.value)}
          placeholder="Báo cáo định kỳ TechOps - {date}"
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">Dùng <code className="bg-muted px-1 rounded">{'{date}'}</code> để tự động điền ngày gửi</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Lời mở đầu</label>
        <textarea
          rows={3}
          value={emailGreeting}
          onChange={(e) => onChange('emailGreeting', e.target.value)}
          placeholder="Xin chào, đây là báo cáo tình trạng công việc..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Send test */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border">
        <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="Nhập email để gửi thử..."
          className="flex-1 h-8 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
        />
        <Button
          size="sm" variant="outline"
          onClick={handleSendTest}
          disabled={sendTest.isPending}
          className="gap-1.5 shrink-0"
        >
          {sendTest.isPending
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang gửi...</>
            : <><Send className="h-3.5 w-3.5" />Gửi thử</>}
        </Button>
      </div>
    </div>
  );
}

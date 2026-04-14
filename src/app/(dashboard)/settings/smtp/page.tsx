'use client';

import { useState } from 'react';
import { Server, FileText } from 'lucide-react';
import { SmtpSection } from '@/modules/settings/components/SmtpSection';
import { EmailTemplatesSection } from '@/modules/settings/components/EmailTemplatesSection';
import { cn } from '@/lib/utils';

type Tab = 'config' | 'templates';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'config',    label: 'Cấu hình SMTP',  icon: Server },
  { key: 'templates', label: 'Mẫu email',       icon: FileText },
];

export default function SmtpPage() {
  const [tab, setTab] = useState<Tab>('config');

  return (
    <div className="space-y-5">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              tab === key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'config'    && <SmtpSection />}
      {tab === 'templates' && <EmailTemplatesSection />}
    </div>
  );
}

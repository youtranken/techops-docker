'use client';

import { useSession } from 'next-auth/react';
import { HelpdeskAdminPanel } from '@/modules/helpdesk/sections/HelpdeskAdminPanel';
import { TicketListSection }  from '@/modules/helpdesk/sections/TicketListSection';

export default function HelpdeskPage() {
  const { data: session } = useSession();
  const role = session?.user?.role?.name ?? '';
  const isAdmin = ['ADMIN', 'BOSS'].includes(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Helpdesk</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý và đồng bộ ticket từ Helpdesk API
        </p>
      </div>

      {isAdmin && <HelpdeskAdminPanel />}

      <TicketListSection />
    </div>
  );
}

// ─── Public API for the helpdesk module ───────────────────────────────────────
// Import types from here; services/hooks can be imported directly if needed.

export type {
  HelpdeskTicket,
  SyncResult,
  HelpdeskPendingItem,
  PendingFilters,
  FilterOptions,
  PushResult,
  CronConfig,
} from './types';

export { ImportSection }      from './sections/ImportSection';
export { PushToTasksSection } from './sections/PushToTasksSection';
export { TicketListSection }  from './sections/TicketListSection';

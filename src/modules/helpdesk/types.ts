// ─── All shared types for the helpdesk module ─────────────────────────────────
// No imports from services/hooks — this file is the root of the type hierarchy.

/** Internal ticket struct — normalized từ raw API response */
export interface HelpdeskTicket {
  code:        string;
  ngayTao:     string;
  nhanVien:    string;
  phongBan:    string;
  tieuDe:      string;
  loaiYeuCau:  string;
  uuTien:      string;
  dienGiai:    string;
  trangThai:   string;
  itSupport:   string | null;
  timeStamp:   string | null;  // Thoi gian hoan thanh (TimeStamp hoac timestamp)
}

export interface SyncResult {
  synced:       number;
  pending:      number;
  skipped:      number;
  fetchedCount: number;
  errors:       Array<{ code: string; message: string; hdId?: string }>;
}

/** Shape of a helpdeskPendingTask record as returned from the API */
export interface HelpdeskPendingItem {
  id:            string;
  hdId:          string;
  tieuDe:        string;
  dienGiai:      string;
  uuTien:        string;
  loaiYeuCau:    string;
  nhanVien:      string;
  phongBan:      string;
  thoiGian:      string;        // Ngay tao ticket
  trangThai:     string;        // Trang thai goc tu Helpdesk
  itSupport:     string | null;
  ngayHoanThanh: string | null; // = timeStamp tu API
  status:        string;
  createdAt:     string;
  updatedAt:     string;
}

/** Filters for querying pending tickets (page/limit optional — not always sent by UI) */
export interface PendingFilters {
  search?:    string;
  uuTien?:    string;
  trangThai?: string;
  itSupport?: string;
  dateFrom?:  string;   // ISO date string
  dateTo?:    string;
  page?:      number;
  limit?:     number;
}

export interface FilterOptions {
  uuTien:    string[];
  trangThai: string[];
  itSupport: string[];
}

export interface PushResult {
  pushed:  number;
  skipped: number;
  noUser:  number;
  total:   number;
  errors:  Array<{ hdId: string; message: string }>;
}

export interface CronConfig {
  enabled:    boolean;
  hour:       number;
  minute:     number;
  enabled2:   boolean;
  hour2:      number;
  minute2:    number;
  lastRunAt:  string | null;
  lastResult: { synced: number; pending: number; skipped: number; errors: number } | null;
}

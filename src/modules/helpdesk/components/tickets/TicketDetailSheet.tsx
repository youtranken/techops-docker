'use client';

import { X, CheckCircle2, Clock } from 'lucide-react';
import type { HelpdeskPendingItem } from '@/modules/helpdesk/types';
import { UuTienBadge, TrangThaiBadge } from './StatusBadge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  } catch {
    return dateStr;
  }
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-border last:border-0">
      <span className="w-36 shrink-0 text-xs text-muted-foreground pt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1 min-w-0">{children}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TicketDetailSheetProps {
  item:    HelpdeskPendingItem | null;
  open:    boolean;
  onClose: () => void;
}

export function TicketDetailSheet({ item, open, onClose }: TicketDetailSheetProps) {
  if (!open || !item) return null;

  const isPushed    = item.status === 'PUSHED';
  const isCompleted = item.trangThai === 'Completed';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — slide in từ phải */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="space-y-1 min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {item.hdId}
              </span>
              {isPushed && (
                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Đã tạo Task
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold leading-snug">{item.tieuDe}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* ── Trạng thái & phân loại ────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Phân loại
            </p>
            <div className="bg-muted/40 rounded-lg divide-y divide-border">
              <Row label="Trạng thái">
                <TrangThaiBadge trangThai={item.trangThai} />
              </Row>
              <Row label="Ưu tiên">
                <UuTienBadge uuTien={item.uuTien} />
              </Row>
              <Row label="Loại yêu cầu">
                {item.loaiYeuCau || <span className="text-muted-foreground italic">—</span>}
              </Row>
            </div>
          </div>

          {/* ── Thông tin nhân viên ───────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Nhân viên yêu cầu
            </p>
            <div className="bg-muted/40 rounded-lg divide-y divide-border">
              <Row label="Nhân viên">{item.nhanVien || '—'}</Row>
              <Row label="Phòng ban">{item.phongBan || '—'}</Row>
            </div>
          </div>

          {/* ── IT Support ────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              IT Support
            </p>
            <div className="bg-muted/40 rounded-lg divide-y divide-border">
              <Row label="Người xử lý">
                {item.itSupport
                  ? <span className="font-medium">{item.itSupport}</span>
                  : <span className="text-muted-foreground italic text-xs">Chưa gán</span>
                }
              </Row>
            </div>
          </div>

          {/* ── Thời gian ─────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Thời gian
            </p>
            <div className="bg-muted/40 rounded-lg divide-y divide-border">
              <Row label="Ngày tạo">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDateTime(item.thoiGian)}
                </span>
              </Row>
              <Row label="Ngày hoàn thành">
                {isCompleted
                  ? formatDateTime(item.ngayHoanThanh)
                  : <span className="text-muted-foreground/50 text-xs">—</span>
                }
              </Row>
            </div>
          </div>

          {/* ── Nội dung ──────────────────────────────────────────────── */}
          {item.dienGiai && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Diễn giải
              </p>
              <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {item.dienGiai}
              </div>
            </div>
          )}

          {/* ── Meta ──────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Metadata
            </p>
            <div className="bg-muted/40 rounded-lg divide-y divide-border">
              <Row label="Trạng thái hệ thống">
                <span className={`text-xs font-medium ${isPushed ? 'text-green-700' : 'text-amber-600'}`}>
                  {isPushed ? 'PUSHED — đã tạo Task' : 'UNASSIGNED — chờ xử lý'}
                </span>
              </Row>
              <Row label="Nhập vào lúc">{formatDateTime(item.createdAt)}</Row>
              <Row label="Cập nhật lúc">{formatDateTime(item.updatedAt)}</Row>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );
}

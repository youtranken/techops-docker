import ExcelJS from 'exceljs';
import type { helpdeskPendingService } from '@/modules/helpdesk/services/helpdesk-pending.service';

type PendingItem = Awaited<ReturnType<typeof helpdeskPendingService.list>>['data'][number];

function formatDateVN(d: Date | string | null | undefined): string {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return ''; }
}

const TRANG_THAI_COLOR: Record<string, string> = {
  Completed:    'FF059669',
  Rejected:     'FFDC2626',
  Pending:      'FFD97706',
  'In Progress':'FF2563EB',
  Cancelled:    'FF6B7280',
};

const UU_TIEN_COLOR: Record<string, string> = {
  'Khẩn cấp': 'FFDC2626',
  'Cao':       'FFD97706',
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
  });
  row.height = 26;
}

function styleDataRow(row: ExcelJS.Row, even: boolean) {
  row.eachCell((cell) => {
    if (even) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
  });
  row.height = 20;
}

export async function buildHelpdeskXlsx(items: PendingItem[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TechOps';
  wb.created = new Date();

  const ws = wb.addWorksheet('Danh sách Ticket Helpdesk');

  ws.columns = [
    { header: 'Code',                key: 'hdId',          width: 16 },
    { header: 'Tiêu đề',             key: 'tieuDe',        width: 42 },
    { header: 'Nhân viên',           key: 'nhanVien',      width: 22 },
    { header: 'Phòng ban',           key: 'phongBan',      width: 22 },
    { header: 'Ưu tiên',             key: 'uuTien',        width: 13 },
    { header: 'Trạng thái',          key: 'trangThai',     width: 15 },
    { header: 'IT Support',          key: 'itSupport',     width: 22 },
    { header: 'Ngày tạo',            key: 'thoiGian',      width: 13 },
    { header: 'Ngày hoàn thành',     key: 'ngayHoanThanh', width: 16 },
    { header: 'Trạng thái hệ thống', key: 'statusLabel',   width: 16 },
  ];

  styleHeader(ws.getRow(1));

  items.forEach((r, i) => {
    const row = ws.addRow({
      hdId:          r.hdId,
      tieuDe:        r.tieuDe,
      nhanVien:      r.nhanVien,
      phongBan:      r.phongBan,
      uuTien:        r.uuTien,
      trangThai:     r.trangThai,
      itSupport:     r.itSupport ?? '',
      thoiGian:      formatDateVN(r.thoiGian),
      ngayHoanThanh: r.trangThai === 'Completed' ? formatDateVN(r.ngayHoanThanh) : '',
      statusLabel:   r.status === 'PUSHED' ? '✓ Đã tạo Task' : 'Chờ xử lý',
    });

    styleDataRow(row, i % 2 === 1);

    const ttColor = TRANG_THAI_COLOR[r.trangThai];
    if (ttColor) row.getCell('trangThai').font = { color: { argb: ttColor }, bold: true };

    const utColor = UU_TIEN_COLOR[r.uuTien];
    if (utColor) row.getCell('uuTien').font = { color: { argb: utColor }, bold: true };

    if (r.status === 'PUSHED') {
      row.getCell('statusLabel').font = { color: { argb: 'FF059669' }, bold: true };
    }
  });

  ws.views = [{ state: 'frozen', ySplit: 1 }];

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

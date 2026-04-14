import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { parseDate } from '@/lib/date';

const STATUS_LABELS: Record<string, string> = {
  PENDING:           'Chờ tiếp nhận',
  ACKNOWLEDGED:      'Đã tiếp nhận',
  IN_PROGRESS:       'Đang thực hiện',
  COMPLETED:         'Hoàn thành',
  REJECTED:          'Từ chối',
  TRANSFERRED:       'Chuyển giao',
  REVISION_REQUIRED: 'Cần sửa lại',
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  row.height = 26;
}

function addTaskSheet(wb: ExcelJS.Workbook, sheetName: string, rows: Awaited<ReturnType<typeof analyticsService.getTaskList>>['rows']) {
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  ws.columns = [
    { header: 'Mã task',         key: 'taskCode',       width: 14 },
    { header: 'Tên task',        key: 'taskTitle',      width: 36 },
    { header: 'Loại',            key: 'taskType',       width: 18 },
    { header: 'Ngày nhận',       key: 'receivedAt',     width: 14 },
    { header: 'Deadline',        key: 'scheduleEnd',    width: 14 },
    { header: 'Ngày HT',         key: 'completedAt',    width: 14 },
    { header: 'Số ngày XL',      key: 'processingDays', width: 12 },
    { header: 'Đúng/Trễ hạn',   key: 'onTime',         width: 14 },
    { header: 'Trạng thái',      key: 'status',         width: 18 },
  ];
  styleHeader(ws.getRow(1));

  rows.forEach((r, i) => {
    const onTimeLabel = r.isOverdue
      ? 'Quá hạn'
      : r.isOnTime === true ? 'Đúng hạn'
      : r.isOnTime === false ? 'Trễ hạn'
      : '—';

    const row = ws.addRow({
      taskCode:       r.taskCode ?? '—',
      taskTitle:      r.taskTitle,
      taskType:       r.taskType,
      receivedAt:     dayjs(r.receivedAt).format('DD/MM/YYYY'),
      scheduleEnd:    dayjs(r.scheduleEnd).format('DD/MM/YYYY'),
      completedAt:    r.completedAt ? dayjs(r.completedAt).format('DD/MM/YYYY') : '—',
      processingDays: r.processingDays ?? '—',
      onTime:         onTimeLabel,
      status:         STATUS_LABELS[r.status] ?? r.status,
    });

    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      });
    }

    const onTimeCell = row.getCell('onTime');
    if (onTimeLabel === 'Đúng hạn') onTimeCell.font = { color: { argb: 'FF059669' }, bold: true };
    else if (onTimeLabel === 'Trễ hạn' || onTimeLabel === 'Quá hạn') onTimeCell.font = { color: { argb: 'FFDC2626' }, bold: true };
    row.height = 18;
  });

  return ws;
}

export async function GET(req: Request) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const dateFrom  = parseDate(searchParams.get('dateFrom'));
  const dateTo    = parseDate(searchParams.get('dateTo'));
  const userId    = searchParams.get('userId') ?? undefined;
  const rawPeriod = searchParams.get('period') ?? 'du-lieu';
  const period    = rawPeriod.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 60) || 'du-lieu';

  const data = await analyticsService.getTaskList({ dateFrom, dateTo, userId, page: 1, pageSize: 10000 });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'TechOps';

  if (userId) {
    const empName = data.rows[0]?.displayName ?? 'Nhan-vien';
    addTaskSheet(wb, empName, data.rows);
  } else {
    const empMap = new Map<string, { name: string; rows: typeof data.rows }>();
    for (const row of data.rows) {
      if (!empMap.has(row.userId)) empMap.set(row.userId, { name: row.displayName, rows: [] });
      empMap.get(row.userId)!.rows.push(row);
    }
    for (const { name, rows } of empMap.values()) {
      addTaskSheet(wb, name, rows);
    }
    if (empMap.size === 0) wb.addWorksheet('Không có dữ liệu');
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `task-list-${period}.xlsx`;
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

import { NextResponse } from 'next/server';
import { requireMenuPermission } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { parseDate } from '@/lib/date';

// ─── Period label helper ───────────────────────────────────────────────────

function derivePeriod(
  dateFrom?: Date,
  dateTo?: Date,
  preset?: string,
): { label: string; filename: string } {
  if (!dateFrom || !dateTo) return { label: 'Toàn bộ', filename: 'toan-bo' };

  const df = dayjs(dateFrom);
  const dt = dayjs(dateTo);

  if (preset === 'month' || (df.date() === 1 && dt.date() === dt.daysInMonth())) {
    if (df.month() === dt.month() && df.year() === dt.year()) {
      const m = df.month() + 1;
      const y = df.year();
      return { label: `Tháng ${m}/${y}`, filename: `Thang-${m}-${y}` };
    }
  }

  if (preset === 'quarter' || (df.date() === 1 && dt.date() === dt.daysInMonth())) {
    const monthDiff = dt.diff(df, 'month');
    if (monthDiff === 2 && df.month() % 3 === 0) {
      const q = Math.floor(df.month() / 3) + 1;
      const y = df.year();
      return { label: `Quý ${q}/${y}`, filename: `Quy-${q}-${y}` };
    }
  }

  return {
    label: `${df.format('DD/MM/YYYY')} – ${dt.format('DD/MM/YYYY')}`,
    filename: `${df.format('DDMMYYYY')}-${dt.format('DDMMYYYY')}`,
  };
}

// ─── Style helpers ─────────────────────────────────────────────────────────

function styleHeader(row: ExcelJS.Row, bgColor = 'FF4F46E5') {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });
  row.height = 24;
}

function styleDataRow(row: ExcelJS.Row, even: boolean) {
  row.eachCell((cell) => {
    if (even) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
  });
  row.height = 20;
}

// ─── Route ─────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const user = await requireMenuPermission('analytics');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') ?? 'xlsx';
  if (format !== 'xlsx') {
    return NextResponse.json({ error: { code: 'INVALID_FORMAT', message: 'Use xlsx' } }, { status: 400 });
  }

  const dateFrom = parseDate(searchParams.get('dateFrom'));
  const dateTo   = parseDate(searchParams.get('dateTo'));
  const preset   = searchParams.get('preset') ?? undefined;
  const filters  = { dateFrom, dateTo };

  const { label, filename } = derivePeriod(dateFrom, dateTo, preset);

  const [kpi, performance, taskTypes, funnel] = await Promise.all([
    analyticsService.getKpiOverview(filters),
    analyticsService.getUserPerformance(filters),
    analyticsService.getAvgTimeByTaskType(filters),
    analyticsService.getTaskFlowFunnel(filters),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TechOps';
  workbook.created = new Date();

  // ── Sheet 1: KPI ──────────────────────────────────────────────────────────
  const kpiSheet = workbook.addWorksheet('KPI Tổng Quan');
  kpiSheet.columns = [
    { header: 'Chỉ số', key: 'metric', width: 30 },
    { header: 'Giá trị', key: 'value', width: 18 },
  ];
  styleHeader(kpiSheet.getRow(1));
  const completionRate = kpi.totalTasksCreated > 0
    ? `${(kpi.totalCompleted / kpi.totalTasksCreated * 100).toFixed(1)}%` : '0%';
  const kpiRows = [
    { metric: 'Kỳ báo cáo', value: label },
    { metric: 'Tổng công việc tạo mới', value: kpi.totalTasksCreated },
    { metric: 'Hoàn thành', value: kpi.totalCompleted },
    { metric: 'Tỉ lệ hoàn thành', value: completionRate },
    { metric: 'Đã huỷ', value: kpi.totalCancelled },
    { metric: 'Quá hạn (hiện tại)', value: kpi.totalOverdue },
    { metric: 'Gia hạn (đang chờ)', value: kpi.extensionCount },
    { metric: 'Tỷ lệ gia hạn', value: `${kpi.extensionRate}%` },
  ];
  kpiRows.forEach((r, i) => {
    const row = kpiSheet.addRow(r);
    styleDataRow(row, i % 2 === 1);
    if (i === 0) row.getCell('value').font = { bold: true };
  });

  // ── Sheet 2: Hiệu Suất Nhân Viên ─────────────────────────────────────────
  const perfSheet = workbook.addWorksheet('Hiệu Suất Nhân Viên');
  perfSheet.columns = [
    { header: 'Họ tên',        key: 'displayName',     width: 26 },
    { header: 'Tổng task',     key: 'totalAssigned',   width: 12 },
    { header: 'Hoàn thành',    key: 'tasksCompleted',  width: 14 },
    { header: 'Tỉ lệ HT',      key: 'completionRate',  width: 12 },
    { header: 'Đang TH',       key: 'inProgress',      width: 12 },
    { header: 'Từ chối',       key: 'rejectionCount',  width: 12 },
    { header: 'Quá hạn',       key: 'overdueCount',    width: 12 },
    { header: 'Chuyển giao',   key: 'transferredCount',width: 14 },
  ];
  styleHeader(perfSheet.getRow(1), 'FF059669');
  performance.forEach((p, i) => {
    const rate = p.totalAssigned > 0
      ? `${Math.round(p.tasksCompleted / p.totalAssigned * 100)}%` : '0%';
    const row = perfSheet.addRow({
      displayName: p.displayName,
      totalAssigned: p.totalAssigned,
      tasksCompleted: p.tasksCompleted,
      completionRate: rate,
      inProgress: p.inProgress,
      rejectionCount: p.rejectionCount,
      overdueCount: p.overdueCount,
      transferredCount: p.transferredCount,
    });
    styleDataRow(row, i % 2 === 1);
    if (p.overdueCount > 0) row.getCell('overdueCount').font = { color: { argb: 'FFDC2626' }, bold: true };
  });

  // ── Sheet 3: Thời Gian Theo Loại Task ────────────────────────────────────
  const typeSheet = workbook.addWorksheet('Thời Gian Loại Task');
  typeSheet.columns = [
    { header: 'Loại task',  key: 'name',      width: 28 },
    { header: 'Số lượng',   key: 'taskCount', width: 13 },
    { header: 'TB ngày HT', key: 'avgDays',   width: 15 },
  ];
  styleHeader(typeSheet.getRow(1), 'FF6366F1');
  taskTypes.forEach((t, i) => {
    const row = typeSheet.addRow(t);
    styleDataRow(row, i % 2 === 1);
  });

  // ── Sheet 4: Funnel Xử Lý ─────────────────────────────────────────────────
  const funnelSheet = workbook.addWorksheet('Funnel Xử Lý');
  funnelSheet.columns = [
    { header: 'Giai đoạn', key: 'label',      width: 24 },
    { header: 'Số lượng',  key: 'count',      width: 13 },
    { header: 'Tỷ lệ %',   key: 'percentage', width: 12 },
  ];
  styleHeader(funnelSheet.getRow(1), 'FFF59E0B');
  funnel.forEach((s, i) => {
    const row = funnelSheet.addRow(s);
    styleDataRow(row, i % 2 === 1);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const safeFilename = filename.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 60) || 'analytics';
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeFilename}.xlsx"`,
    },
  });
}

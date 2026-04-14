import { analyticsService } from './analytics.service';
import { researchService } from './research.service';

export type PdfMode = 'full' | 'data';

interface PdfFilters {
  dateFrom?: Date;
  dateTo?: Date;
}

// ─── HTML Template helpers ────────────────────────────────────────────────────

function row(label: string, value: string | number): string {
  return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;font-size:13px">${value}</td></tr>`;
}

function section(title: string, content: string): string {
  return `<div style="margin-bottom:28px"><h2 style="font-size:15px;font-weight:700;color:#1f2937;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px">${title}</h2>${content}</div>`;
}

function buildHtml(
  kpi: Awaited<ReturnType<typeof analyticsService.getKpiOverview>>,
  performance: Awaited<ReturnType<typeof analyticsService.getUserPerformance>>,
  taskTypes: Awaited<ReturnType<typeof analyticsService.getAvgTimeByTaskType>>,
  funnel: Awaited<ReturnType<typeof analyticsService.getTaskFlowFunnel>>,
  dateLabel: string,
  mode: PdfMode,
): string {
  const kpiTable = `<table style="width:100%;border-collapse:collapse">${[
    row('Tổng Tasks Tạo', kpi.totalTasksCreated),
    row('Hoàn Thành', kpi.totalCompleted),
    row('Đã Hủy', kpi.totalCancelled),
    row('TB Ngày Hoàn Thành', `${kpi.avgCompletionTimeDays} ngày`),
    row('Tỷ Lệ Đúng Hạn', `${kpi.onTimeRate}%`),
    row('Tỷ Lệ Gia Hạn', `${kpi.extensionRate}%`),
  ].join('')}</table>`;

  const perfTable = `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280">Nhân viên</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">Tổng</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">Hoàn thành</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">Đang TH</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">Từ chối</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">Quá hạn</th></tr></thead><tbody>${performance.map((p) => `<tr><td style="padding:6px 12px;font-size:13px">${p.displayName}</td><td style="padding:6px 12px;text-align:right;font-size:13px">${p.totalAssigned}</td><td style="padding:6px 12px;text-align:right;font-size:13px">${p.tasksCompleted}</td><td style="padding:6px 12px;text-align:right;font-size:13px">${p.inProgress}</td><td style="padding:6px 12px;text-align:right;font-size:13px">${p.rejectionCount}</td><td style="padding:6px 12px;text-align:right;font-size:13px;color:${p.overdueCount > 0 ? '#dc2626' : '#6b7280'}">${p.overdueCount}</td></tr>`).join('')}</tbody></table>`;

  const typeTable = `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280">Loại Task</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">Số lượng</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">TB ngày</th></tr></thead><tbody>${taskTypes.map((t) => `<tr><td style="padding:6px 12px;font-size:13px">${t.name}</td><td style="padding:6px 12px;text-align:right;font-size:13px">${t.taskCount}</td><td style="padding:6px 12px;text-align:right;font-size:13px">${t.avgDays}d</td></tr>`).join('')}</tbody></table>`;

  const funnelRows = funnel.map((s) => `<tr><td style="padding:6px 12px;font-size:13px">${s.label}</td><td style="padding:6px 12px;text-align:right;font-size:13px;font-weight:600">${s.count}</td><td style="padding:6px 12px;text-align:right;font-size:13px;color:#6b7280">${s.percentage}%</td></tr>`).join('');
  const funnelTable = `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280">Giai đoạn</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">Số lượng</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280">Tỷ lệ</th></tr></thead><tbody>${funnelRows}</tbody></table>`;

  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:32px;color:#111827;background:#fff}h1{font-size:20px;font-weight:800;color:#111827;margin:0}p{color:#6b7280;font-size:13px;margin:4px 0 0}</style></head><body><div style="margin-bottom:32px;display:flex;justify-content:space-between;align-items:flex-start"><div><h1>TechOps — Báo Cáo Analytics</h1><p>${dateLabel}</p><p>Xuất lúc: ${new Date().toLocaleString('vi-VN')}</p></div></div>${section('KPI Tổng Quan', kpiTable)}${mode === 'full' ? section('Thời Gian Theo Loại Task', typeTable) + section('Funnel Xử Lý', funnelTable) : ''}${section('Hiệu Suất Nhân Viên', perfTable)}</body></html>`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class PdfService {
  async generate(filters: PdfFilters, mode: PdfMode = 'full'): Promise<Buffer> {
    const [kpi, performance, taskTypes, funnel] = await Promise.all([
      analyticsService.getKpiOverview(filters),
      analyticsService.getUserPerformance(filters),
      analyticsService.getAvgTimeByTaskType(filters),
      analyticsService.getTaskFlowFunnel(filters),
    ]);

    const dateLabel =
      filters.dateFrom && filters.dateTo
        ? `${filters.dateFrom.toLocaleDateString('vi-VN')} — ${filters.dateTo.toLocaleDateString('vi-VN')}`
        : 'Toàn bộ thời gian';

    const html = buildHtml(kpi, performance, taskTypes, funnel, dateLabel, mode);

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
        printBackground: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

export const pdfService = new PdfService();

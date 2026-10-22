import cron from 'node-cron';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import dayjs from '@/lib/date';
import { getRedis } from '@/lib/redis';

const LOCK_KEY = 'lock:cron:log-archive';
const LOCK_TTL = 300; // giây — export Excel có thể mất vài phút

function styleHeader(row: ExcelJS.Row, bgColor = 'FF4F46E5') {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
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

async function exportUserActivity(wb: ExcelJS.Workbook, from: Date, to: Date) {
  const rows = await prisma.userActivityLog.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { user: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const ws = wb.addWorksheet('User Activity');
  ws.columns = [
    { header: 'Thời gian',    key: 'createdAt',   width: 20 },
    { header: 'Người dùng',   key: 'user',         width: 24 },
    { header: 'Hành động',    key: 'action',       width: 22 },
    { header: 'Chi tiết',     key: 'detail',       width: 36 },
    { header: 'IP',           key: 'ip',           width: 16 },
    { header: 'Loại IP',      key: 'ipType',       width: 10 },
    { header: 'ISP',          key: 'isp',          width: 20 },
    { header: 'Thành phố',    key: 'city',         width: 16 },
    { header: 'Quốc gia',     key: 'country',      width: 14 },
  ];
  styleHeader(ws.getRow(1), 'FF0F766E');

  rows.forEach((r, i) => {
    const meta = r.metadata as Record<string, unknown> | null;
    const row = ws.addRow({
      createdAt: dayjs(r.createdAt).format('DD/MM/YYYY HH:mm:ss'),
      user:      r.user
        ? r.user.displayName
        : `Unknown (${(r.metadata as { attemptedUsername?: string } | null)?.attemptedUsername ?? '?'})`,
      action:    r.action,
      detail:    meta ? JSON.stringify(meta) : '',
      ip:        r.ipAddress ?? '',
      ipType:    r.ipType ?? '',
      isp:       r.ispName ?? '',
      city:      r.city ?? '',
      country:   r.country ?? '',
    });
    styleDataRow(row, i % 2 === 1);
  });

  return rows.length;
}

async function exportTaskAudit(wb: ExcelJS.Workbook, from: Date, to: Date) {
  const rows = await prisma.taskAuditLog.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: {
      performedBy: { select: { displayName: true } },
      task:        { select: { taskCode: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const ws = wb.addWorksheet('Task Activity');
  ws.columns = [
    { header: 'Thời gian',     key: 'createdAt',    width: 20 },
    { header: 'Người thực hiện', key: 'user',        width: 24 },
    { header: 'Hành động',     key: 'action',        width: 24 },
    { header: 'Mã task',       key: 'taskCode',      width: 12 },
    { header: 'Tên task',      key: 'taskTitle',     width: 36 },
    { header: 'Trạng thái cũ', key: 'oldStatus',     width: 18 },
    { header: 'Trạng thái mới', key: 'newStatus',    width: 18 },
  ];
  styleHeader(ws.getRow(1), 'FF4F46E5');

  rows.forEach((r, i) => {
    const row = ws.addRow({
      createdAt: dayjs(r.createdAt).format('DD/MM/YYYY HH:mm:ss'),
      user:      r.performedBy.displayName,
      action:    r.action,
      taskCode:  r.task?.taskCode ?? '',
      taskTitle: r.task?.title ?? '',
      oldStatus: r.oldStatus ?? '',
      newStatus: r.newStatus ?? '',
    });
    styleDataRow(row, i % 2 === 1);
  });

  return rows.length;
}

async function runArchive() {
  const archivePath = process.env.LOG_ARCHIVE_PATH;
  if (!archivePath) {
    console.warn('[log-archive] LOG_ARCHIVE_PATH not set — skipping');
    return;
  }

  const prevMonth = dayjs().subtract(1, 'month');
  const from = prevMonth.startOf('month').toDate();
  const to   = prevMonth.endOf('month').toDate();
  const folder = path.join(archivePath, prevMonth.format('YYYY-MM'));

  fs.mkdirSync(folder, { recursive: true });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'TechOps';
  wb.created = new Date();

  const [uCount, tCount] = await Promise.all([
    exportUserActivity(wb, from, to),
    exportTaskAudit(wb, from, to),
  ]);

  const outFile = path.join(folder, 'logs.xlsx');
  await wb.xlsx.writeFile(outFile);
  console.log(`[log-archive] Exported ${uCount} user + ${tCount} task logs → ${outFile}`);

  const cutoff = dayjs().subtract(90, 'day').toDate();
  const [delUser, delTask] = await Promise.all([
    prisma.userActivityLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.taskAuditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
  console.log(`[log-archive] Purged ${delUser.count} user logs, ${delTask.count} task logs older than 90 days`);
}

export function startLogArchiveCron(): void {
  if (!process.env.LOG_ARCHIVE_PATH) {
    console.log('[log-archive] LOG_ARCHIVE_PATH not set — cron disabled');
    return;
  }

  cron.schedule('0 1 1 * *', async () => {
    const redis = getRedis();
    let acquired = false;
    try {
      acquired = !!(await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX'));
    } catch { /* Redis down — skip */ }
    if (!acquired) {
      console.log('⏭️  [LogArchive] Bỏ qua — instance khác đang chạy (lock held)');
      return;
    }

    console.log('[log-archive] Starting monthly log archive...');
    try {
      await runArchive();
    } catch (err) {
      console.error('[log-archive] Error:', err);
    } finally {
      try { await redis.del(LOCK_KEY); } catch { /* ignore */ }
    }
  });

  console.log('[log-archive] Cron started (1st of month at 01:00)');
}

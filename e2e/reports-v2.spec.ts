/**
 * E2E — V2 A3-5: Báo cáo (Tổng quan · Danh sách công việc · Research). Nghiệp vụ giữ V1: cùng API + tham số.
 *  (a) Boss · Tổng quan tháng này: ô KPI = API = DB; chênh lệch = kỳ hiện tại − kỳ trước (API); dòng phụ có kỳ.
 *  (b) Bấm ô "Tổng công việc" → danh sách (= API drill-down) → bấm việc [E2E] → ngăn chi tiết.
 *  (c) Kỳ: Quý → URL preset/dateFrom/dateTo như V1; Tuỳ chọn sai thứ tự → báo lỗi, không đổi kỳ; Excel href = V1.
 *  (d) Hiệu suất → Danh sách công việc của 1 người: giữ khoảng ngày (V1 bị đặt lại về tháng hiện tại), ẩn cột Người làm,
 *      tóm tắt = API, tìm + sắp xếp ghi vào URL, bấm dòng → ngăn chi tiết.
 *  (e) Research: số việc quá hạn = API, lọc ≥ N ngày; khối lượng.
 *  (f) Nhân viên có menu Báo cáo: chỉ tab Tổng quan (V1); 390px không cuộn ngang; tiếng Anh.
 * 2 lần đăng nhập (Boss, Nhân viên). Dữ liệu [E2E] tạo qua API V1, dọn ở globalTeardown; cache Redis `analytics:*` xoá trước khi đo.
 */
import { test, expect, type Page, type Cookie } from '@playwright/test';
import Redis from 'ioredis';
import { login, api } from './helpers/auth';
import { E2E_USERS, psql } from './helpers/db';
import { refs, createTask } from './helpers/seed';

const RUN = `R${Date.now().toString(36)}`;
const TITLE = `[E2E] Báo cáo ${RUN}`;
const sessions: Record<'boss' | 'emp', Cookie[]> = { boss: [], emp: [] };
let taskId = '';
let empId = '';

// kỳ "tháng này" theo giờ VN (như trang)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const [Y, M] = today.split('-').map(Number);
const pad = (n: number) => String(n).padStart(2, '0');
const last = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const MONTH = { dateFrom: `${Y}-${pad(M)}-01`, dateTo: `${Y}-${pad(M)}-${pad(last(Y, M))}` };
const Q0 = Math.floor((M - 1) / 3) * 3 + 1;
const QUARTER = { dateFrom: `${Y}-${pad(Q0)}-01`, dateTo: `${Y}-${pad(Q0 + 2)}-${pad(last(Y, Q0 + 2))}` };

async function clearCache() {
  const r = new Redis(process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:16379');
  try {
    const keys = await r.keys('analytics:*');
    if (keys.length) await r.del(...keys);
  } finally { r.disconnect(); }
}
async function as(page: Page, who: 'boss' | 'emp') {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}
const vi = (n: number) => n.toLocaleString('vi-VN');
const count = (sql: string) => Number(psql(sql));
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** createdAt của Prisma là UTC; V1 parseDate('YYYY-MM-DD') = 00:00 giờ máy chủ (cùng máy với test). */
const utc = (d: string) => new Date(`${d}T00:00:00`).toISOString().replace('T', ' ').replace('Z', '');

interface Kpi { totalTasksCreated: number; totalCompleted: number; totalOverdue: number; tasksByStatus: Record<string, number> }

test.describe.serial('V2 — Báo cáo', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(300_000);
    const ctx = await browser.newContext({ baseURL: info.project.use.baseURL });
    const page = await ctx.newPage();
    await login(page, E2E_USERS.boss.username);
    const r = await refs(page);
    empId = r.empId;
    taskId = await createTask(page, { title: TITLE, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId] }, r);
    sessions.boss = await ctx.cookies();
    await ctx.close();
    // Nhân viên [E2E] được cấp menu Báo cáo (bản ghi riêng, xoá theo user ở teardown)
    psql(`DELETE FROM "SidebarPermission" WHERE "userId"='${empId}';
      INSERT INTO "SidebarPermission"(id,"userId","visibleMenus","featurePermissions","createdAt","updatedAt")
      VALUES ('ce2erpperm${empId.slice(-15)}','${empId}','["analytics"]','{}', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC');`);
    const c2 = await browser.newContext({ baseURL: info.project.use.baseURL });
    await login(await c2.newPage(), E2E_USERS.emp.username);
    sessions.emp = await c2.cookies();
    await c2.close();
  });

  test('(a) Tổng quan: KPI = API = DB, chênh lệch so với kỳ trước', async ({ page }) => {
    await as(page, 'boss');
    await clearCache();
    const cur = page.waitForResponse((r) => r.url().includes(`/api/analytics/kpi?dateFrom=${MONTH.dateFrom}&dateTo=${MONTH.dateTo}`) && r.ok(), { timeout: 90_000 });
    await page.goto('/analytics');
    const k = (await (await cur).json()) as Kpi;
    await expect(page.getByTestId('rp-kpis')).toBeVisible({ timeout: 60_000 });
    // DB (cùng điều kiện V1: createdAt ≥ dateFrom 00:00, ≤ dateTo 00:00)
    const where = `"createdAt" >= '${utc(MONTH.dateFrom)}' AND "createdAt" <= '${utc(MONTH.dateTo)}'`;
    expect(k.totalTasksCreated).toBe(count(`SELECT count(*) FROM "Task" WHERE ${where}`));
    expect(k.totalCompleted).toBe(count(`SELECT count(*) FROM "Task" WHERE ${where} AND status='COMPLETED'`));
    expect(k.totalTasksCreated).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId('rp-kpi-total-v')).toHaveText(vi(k.totalTasksCreated));
    await expect(page.getByTestId('rp-kpi-done-v')).toHaveText(vi(k.totalCompleted));
    await expect(page.getByTestId('rp-kpi-prog-v')).toHaveText(vi(k.tasksByStatus.IN_PROGRESS ?? 0));
    await expect(page.getByTestId('rp-kpi-wait-v')).toHaveText(vi((k.tasksByStatus.PENDING_REVIEW ?? 0) + (k.tasksByStatus.WAITING_ACKNOWLEDGE ?? 0)));
    await expect(page.getByTestId('rp-kpi-over-v')).toHaveText(vi(k.totalOverdue));
    // kỳ trước (V1: lùi đúng số ngày) — chênh lệch tổng
    const prevFrom = new Date(Date.UTC(Y, M - 1, 1) - last(Y, M) * 86400000).toISOString().slice(0, 10);
    const prevTo = new Date(Date.UTC(Y, M - 1, 1) - 86400000).toISOString().slice(0, 10);
    const p = (await api<Kpi>(page, `/api/analytics/kpi?dateFrom=${prevFrom}&dateTo=${prevTo}`)).json;
    const d = k.totalTasksCreated - p.totalTasksCreated;
    if (d === 0) await expect(page.getByTestId('rp-kpi-total-d')).toHaveCount(0);
    else await expect(page.getByTestId('rp-kpi-total-d')).toContainText(`${d > 0 ? '+' : '−'}${vi(Math.abs(d))}`);
    await expect(page.getByTestId('rp-sub')).toContainText(`Tháng ${M}/${Y} · so sánh với`);
    await expect(page.getByRole('navigation', { name: 'Mục báo cáo' }).getByRole('link')).toHaveText(['Tổng quan', 'Danh sách công việc']);
  });

  test('(b) Ô KPI → danh sách (= API drill-down) → ngăn chi tiết', async ({ page }) => {
    await as(page, 'boss');
    await page.goto('/analytics');
    const res = page.waitForResponse((r) => r.url().includes('/api/analytics/drilldown?type=total') && r.ok(), { timeout: 60_000 });
    await page.locator('[data-kpi="total"]').click();
    const dd = (await (await res).json()) as { data: { id: string }[] };
    const dlg = page.getByTestId('rp-drill');
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole('heading', { name: 'Tổng công việc' })).toBeVisible();
    await expect(dlg).toContainText(`${vi(dd.data.length)} công việc`);
    await expect(dlg.getByRole('table').getByRole('row')).toHaveCount(Math.min(10, dd.data.length) + 1);
    await dlg.getByRole('row').filter({ hasText: TITLE }).click();
    await expect(dlg).toBeHidden();
    await expect(page.getByRole('dialog').filter({ hasText: TITLE }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('(c) Kỳ: Quý / Tuỳ chọn ghi URL như V1; ngày sai thứ tự báo lỗi; Excel = V1', async ({ page }) => {
    await as(page, 'boss');
    await page.goto('/analytics');
    await expect(page.getByTestId('rp-kpis')).toBeVisible({ timeout: 60_000 });
    await page.getByTestId('rp-pbar').getByRole('button', { name: 'Quý' }).click();
    await expect(page).toHaveURL(new RegExp(`preset=quarter&dateFrom=${QUARTER.dateFrom}&dateTo=${QUARTER.dateTo}`));
    await expect(page.getByTestId('rp-xlsx')).toHaveAttribute('href', `/api/analytics/export?format=xlsx&dateFrom=${QUARTER.dateFrom}&dateTo=${QUARTER.dateTo}&preset=quarter`);
    await page.getByTestId('rp-pbar').getByRole('button', { name: 'Tuỳ chọn' }).click();
    await expect(page).toHaveURL(/preset=custom/);
    await page.locator('#rp-to').fill(`${Y}-${pad(M)}-05`);
    await expect(page).toHaveURL(new RegExp(`dateFrom=${QUARTER.dateFrom}&dateTo=${Y}-${pad(M)}-05`));
    await page.locator('#rp-from').fill(`${Y}-${pad(M)}-20`);
    await expect(page.getByRole('alert').filter({ hasText: 'Ngày bắt đầu phải trước' })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`dateFrom=${QUARTER.dateFrom}`));
    await page.locator('#rp-to').fill(`${Y}-${pad(M)}-25`);
    await expect(page).toHaveURL(new RegExp(`preset=custom&dateFrom=${Y}-${pad(M)}-20&dateTo=${Y}-${pad(M)}-25`));
    expect(await noHScroll(page)).toBe(true);
  });

  test('(d) Hiệu suất → Danh sách công việc 1 người: giữ kỳ, tóm tắt = API, tìm/sắp xếp vào URL, mở chi tiết', async ({ page }) => {
    await as(page, 'boss');
    await clearCache();
    await page.goto(`/analytics?preset=quarter&dateFrom=${QUARTER.dateFrom}&dateTo=${QUARTER.dateTo}`);
    const row = page.getByTestId('rp-perf').getByRole('row').filter({ hasText: E2E_USERS.emp.displayName });
    await expect(row).toBeVisible({ timeout: 60_000 });
    const res = page.waitForResponse((r) => r.url().includes('/api/analytics/task-list?') && r.url().includes(`userId=${empId}`) && r.ok(), { timeout: 60_000 });
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/analytics/task-list\\?userId=${empId}&dateFrom=${QUARTER.dateFrom}&dateTo=${QUARTER.dateTo}`));
    const tl = (await (await res).json()).data as { total: number; kpi: { total: number; completed: number; inProgress: number } };
    expect(tl.total).toBe(count(`SELECT count(*) FROM "TaskAssignee" a JOIN "Task" t ON t.id=a."taskId" WHERE a."userId"='${empId}' AND t."createdAt" >= '${utc(QUARTER.dateFrom)}' AND t."createdAt" <= '${utc(QUARTER.dateTo)}'`));
    // V1 đặt lại về tháng hiện tại; V2 giữ khoảng ngày của link
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(new RegExp(`dateFrom=${QUARTER.dateFrom}&dateTo=${QUARTER.dateTo}`));
    await expect(page.getByTestId('rp-user')).toHaveValue(empId);
    await expect(page.getByTestId('rp-sub')).toContainText(E2E_USERS.emp.displayName);
    await expect(page.getByTestId('rp-tl-sum').locator('[data-sum="total"] b')).toHaveText(vi(tl.kpi.total));
    await expect(page.getByTestId('rp-tl-sum').locator('[data-sum="prog"] b')).toHaveText(vi(tl.kpi.inProgress));
    const table = page.getByTestId('rp-tl-table');
    await expect(table.getByRole('columnheader', { name: 'Người làm' })).toHaveCount(0);
    await page.getByTestId('rp-search').fill(RUN);
    await expect(page).toHaveURL(new RegExp(`search=${RUN}`), { timeout: 10_000 });
    await expect(table.getByRole('row')).toHaveCount(2);
    await table.getByRole('button', { name: 'Sắp xếp theo Hạn' }).click();
    await expect(page).toHaveURL(/sortBy=scheduleEnd&sortOrder=desc/);
    await expect(page.getByTestId('rp-xlsx')).toHaveAttribute('href', `/api/analytics/task-list/export?dateFrom=${QUARTER.dateFrom}&dateTo=${QUARTER.dateTo}&userId=${empId}&period=${QUARTER.dateFrom.split('-').reverse().join('')}-${QUARTER.dateTo.split('-').reverse().join('')}`);
    await table.getByRole('row').filter({ hasText: TITLE }).click();
    await expect(page.getByRole('dialog').filter({ hasText: TITLE }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('(e) Research: số việc quá hạn = API, lọc ≥ N ngày, khối lượng', async ({ page }) => {
    await as(page, 'boss');
    const res = page.waitForResponse((r) => r.url().includes('/api/analytics/overdue') && r.ok(), { timeout: 60_000 });
    await page.goto('/analytics/research');
    const ov = (await (await res).json()) as { daysOverdue: number }[];
    await expect(page.getByTestId('rp-ov-count')).toHaveText(`(${vi(ov.length)})`, { timeout: 30_000 });
    await expect(page.getByRole('navigation', { name: 'Mục báo cáo' }).getByRole('link', { name: 'Quá hạn & khối lượng' })).toHaveAttribute('aria-current', 'page');
    const n = ov.filter((x) => x.daysOverdue >= 3).length;
    await page.getByTestId('rp-rs-min').fill('3');
    await expect(page.getByTestId('rp-ov-count')).toHaveText(n === ov.length ? `(${vi(n)})` : `(${vi(n)}/${vi(ov.length)})`);
    await expect(page.getByTestId('rp-workload')).toBeVisible();
  });

  test('(f) Nhân viên: chỉ tab Tổng quan; 390px không cuộn ngang; tiếng Anh', async ({ page }) => {
    await as(page, 'emp');
    await page.goto('/analytics');
    await expect(page.getByTestId('rp-kpis')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('navigation', { name: 'Mục báo cáo' }).getByRole('link')).toHaveText(['Tổng quan']);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const u of ['/analytics', `/analytics/task-list?dateFrom=${MONTH.dateFrom}&dateTo=${MONTH.dateTo}`, '/analytics/research']) {
      await page.goto(u);
      await expect(page.getByRole('heading', { level: 1, name: 'Báo cáo' })).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(800);
      expect(await noHScroll(page), u).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => { document.cookie = 'NEXT_LOCALE=en; Path=/; SameSite=Lax'; });
    await page.goto('/analytics');
    await expect(page.getByRole('heading', { level: 1, name: 'Reports' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('rp-pbar').getByRole('button', { name: 'Quarter' })).toBeVisible();
  });
});

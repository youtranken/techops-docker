/**
 * E2E — V2 A3-1: trang Tổng quan. Nghiệp vụ giữ V1: số liệu lấy từ `GET /api/dashboard/stats` (+ `/performance`),
 * khác theo vai trò (Boss/Admin vs Nhân viên). Kiểm: số hiển thị = API = DB, khối theo vai trò, bấm việc → ngăn xem nhanh
 * → trang chi tiết, "Xem tất cả" → /tasks, 7/30 ngày, mobile 390 không cuộn ngang.
 * Dữ liệu tiền tố [E2E] (tạo qua API V1 — `seedDetailTasks`), dọn ở globalTeardown.
 * API tổng quan cache Redis 5 phút theo người dùng (V1) → xoá khoá `dashboard:<user E2E>` trước mỗi lần mở trang.
 */
import { test, expect, type Page, type Cookie } from '@playwright/test';
import Redis from 'ioredis';
import { login, api } from './helpers/auth';
import { E2E_USERS, psql } from './helpers/db';
import { seedDetailTasks } from './helpers/seed';

const RUN = `D${Date.now().toString(36)}`;
type Who = 'admin' | 'boss' | 'emp';
const sessions: Record<Who, Cookie[]> = { admin: [], boss: [], emp: [] };
let ids: Awaited<ReturnType<typeof seedDetailTasks>>;

type Stats = {
  totalTasks: number; completedTasks: number; overdueCount: number; slaRate: string;
  pendingApproval: number; pendingReview: number; pendingExtensions: number; myInProgress: number; myWaitingAck: number;
  tasksByStatus: Record<string, number>;
  actionItems: { id: string; title: string }[]; upcomingDeadlines: { id: string; title: string }[];
  recentComments: { task: { id: string } }[];
};

async function clearDash() {
  const r = new Redis(process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:16379');
  try {
    const keys = await r.keys('dashboard:ce2e*');
    if (keys.length) await r.del(...keys);
  } finally { r.disconnect(); }
}
async function as(page: Page, who: Who) {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}
/** Mở Tổng quan (cache vừa xoá) và trả về dữ liệu API mà trang đã nhận. */
async function openDash(page: Page): Promise<Stats> {
  await clearDash();
  const res = page.waitForResponse((r) => r.url().endsWith('/api/dashboard/stats') && r.status() === 200, { timeout: 60_000 });
  await page.goto('/');
  const stats = (await (await res).json()) as Stats;
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 60_000 });
  return stats;
}
const vi = (n: number) => n.toLocaleString('vi-VN');
const kpi = (page: Page, k: string) => page.getByTestId(`kpi-${k}`);
const count = (sql: string) => Number(psql(sql));

test.describe.serial('V2 — Tổng quan', () => {
  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(240_000);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    ids = await seedDetailTasks(page, RUN);
    await page.close();
    for (const who of ['admin', 'boss', 'emp'] as const) {
      const ctx = await browser.newContext({ baseURL: info.project.use.baseURL });
      await login(await ctx.newPage(), E2E_USERS[who].username);
      sessions[who] = await ctx.cookies();
      await ctx.close();
    }
  });

  test('(a) Boss: 6 ô = API = DB; Cần bạn xử lý = Chờ duyệt + Chờ nghiệm thu; badge gia hạn', async ({ page }) => {
    await as(page, 'boss');
    const s = await openDash(page);
    // API = DB (cùng điều kiện V1: Boss thấy toàn bộ)
    expect(s.totalTasks).toBe(count(`SELECT count(*) FROM "Task" WHERE status <> 'CANCELLED'`));
    expect(s.pendingApproval).toBe(count(`SELECT count(*) FROM "Task" WHERE status = 'PENDING_APPROVAL'`));
    expect(s.pendingReview).toBe(count(`SELECT count(*) FROM "Task" WHERE status = 'PENDING_REVIEW'`));
    expect(s.pendingExtensions).toBe(count(`SELECT count(*) FROM "ExtensionRequest" WHERE status = 'PENDING'`));
    expect(s.pendingApproval).toBeGreaterThanOrEqual(1);
    // giao diện = API
    await expect(page.getByTestId('dashboard')).toHaveAttribute('data-role', 'BOSS');
    await expect(kpi(page, 'total')).toHaveText(vi(s.totalTasks));
    await expect(kpi(page, 'done')).toHaveText(vi(s.completedTasks));
    await expect(kpi(page, 'approval')).toHaveText(vi(s.pendingApproval));
    await expect(kpi(page, 'review')).toHaveText(vi(s.pendingReview));
    await expect(kpi(page, 'overdue')).toHaveText(vi(s.overdueCount));
    await expect(kpi(page, 'myProg')).toHaveCount(0);
    await expect(page.getByTestId('db-sub')).toContainText(`Có ${s.pendingApproval + s.pendingReview} việc đang chờ bạn duyệt hoặc nghiệm thu`);
    const act = page.locator('[data-card="db-act"]');
    await expect(act.getByTestId('db-act-row')).toHaveCount(s.actionItems.length);
    await expect(act.getByTestId('db-act-row').filter({ hasText: `[E2E] Chờ duyệt ${RUN}` })).toContainText('Duyệt');
    await expect(act.getByTestId('db-act-row').filter({ hasText: `[E2E] Chờ nghiệm thu ${RUN}` })).toContainText('Nghiệm thu');
    await expect(page.getByTestId('db-ext-badge')).toHaveText(`${s.pendingExtensions} gia hạn`);
  });

  test('(b) Admin giống Boss (ô Chờ duyệt / Chờ nghiệm thu)', async ({ page }) => {
    await as(page, 'admin');
    const s = await openDash(page);
    await expect(page.getByTestId('dashboard')).toHaveAttribute('data-role', 'ADMIN');
    await expect(kpi(page, 'approval')).toHaveText(vi(s.pendingApproval));
    await expect(kpi(page, 'review')).toHaveText(vi(s.pendingReview));
    await expect(page.locator('[data-card="db-act"]').getByTestId('db-act-row')).toHaveCount(s.actionItems.length);
  });

  test('(c) Nhân viên: chỉ việc của mình; ô Bạn đang làm / Chờ bạn nhận; không có badge gia hạn', async ({ page }) => {
    await as(page, 'emp');
    const s = await openDash(page);
    // 4 việc [E2E]: Chờ duyệt (mình tạo), Chờ nhận, Đang làm, Chờ nghiệm thu
    expect(s.totalTasks).toBe(4);
    expect(s.myInProgress).toBe(1);
    expect(s.myWaitingAck).toBe(1);
    await expect(page.getByTestId('dashboard')).toHaveAttribute('data-role', 'EMPLOYEE');
    await expect(kpi(page, 'total')).toHaveText('4');
    await expect(kpi(page, 'myProg')).toHaveText('1');
    await expect(kpi(page, 'myAck')).toHaveText('1');
    await expect(kpi(page, 'approval')).toHaveCount(0);
    await expect(page.getByTestId('db-sub')).toContainText('Bạn có 2 việc cần nhận hoặc báo cáo');
    const rows = page.locator('[data-card="db-act"]').getByTestId('db-act-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: `[E2E] Chờ nhận ${RUN}` })).toContainText('Nhận việc');
    await expect(rows.filter({ hasText: `[E2E] Đang làm ${RUN}` })).toContainText('Báo cáo xong');
    await expect(page.getByTestId('db-ext-badge')).toHaveCount(0);
    // phân bố tháng: 4 việc tạo trong tháng
    await expect(page.getByTestId('db-st-total')).toHaveText('4');
    // bình luận gần đây: 1 việc có bình luận
    await expect(page.getByTestId('db-cm-row')).toHaveCount(s.recentComments.length);
    await expect(page.getByTestId('db-cm-row').first()).toContainText('đang xử lý, chiều xong');
  });

  test('(d) bấm việc → ngăn xem nhanh (‹ › trong khối) → trang chi tiết; Xem tất cả → /tasks', async ({ page }) => {
    await as(page, 'emp');
    const s = await openDash(page);
    const due = page.locator('[data-card="db-due"]').getByTestId('db-due-row');
    await expect(due).toHaveCount(s.upcomingDeadlines.length);
    await due.filter({ hasText: `[E2E] Đang làm ${RUN}` }).click();
    const drawer = page.getByTestId('task-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(`[E2E] Đang làm ${RUN}`, { timeout: 30_000 });
    await drawer.getByRole('link', { name: 'Mở trang đầy đủ' }).click();
    await expect(page).toHaveURL(new RegExp(`/tasks/${ids.progress}$`), { timeout: 60_000 });
    await openDash(page);
    await page.locator('[data-card="db-act"]').getByRole('link', { name: 'Xem tất cả' }).click();
    await expect(page).toHaveURL(/\/tasks$/, { timeout: 60_000 });
  });

  test('(e) Hiệu suất 7/30 ngày: tổng = API performance', async ({ page }) => {
    await as(page, 'boss');
    await openDash(page);
    const chart = page.locator('[data-card="db-perf"]');
    const res7 = page.waitForResponse((r) => r.url().includes('/api/dashboard/performance?days=7'));
    await chart.getByRole('button', { name: '7 ngày' }).click();
    const p7 = (await (await res7).json()) as { created: number; completed: number }[];
    expect(p7).toHaveLength(7);
    await expect(page.getByTestId('db-perf-created')).toHaveText(String(p7.reduce((a, x) => a + x.created, 0)));
    await expect(page.getByTestId('db-perf-done')).toHaveText(String(p7.reduce((a, x) => a + x.completed, 0)));
    await expect(chart.getByRole('button', { name: '7 ngày' })).toHaveAttribute('aria-pressed', 'true');
    // việc [E2E] vừa tạo hôm nay → có ít nhất 4 việc tạo mới
    expect(p7.reduce((a, x) => a + x.created, 0)).toBeGreaterThanOrEqual(4);
  });

  test('(f) mobile 390: không cuộn ngang, dòng chạm ≥ 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await as(page, 'boss');
    await openDash(page);
    const w = await page.evaluate(() => {
      const c = document.getElementById('content')!;
      return { doc: document.documentElement.scrollWidth, content: c.scrollWidth - c.clientWidth };
    });
    expect(w.doc).toBeLessThanOrEqual(390);
    expect(w.content).toBeLessThanOrEqual(0);
    const h = await page.getByTestId('db-act-row').first().boundingBox();
    expect(h!.height).toBeGreaterThanOrEqual(44);
    const link = await page.locator('[data-card="db-act"]').getByRole('link', { name: 'Xem tất cả' }).boundingBox();
    expect(link!.height).toBeGreaterThanOrEqual(44);
  });

  test('(g) lỗi API → thông báo + Thử lại tải lại được', async ({ page }) => {
    await as(page, 'boss');
    let fail = true;
    await page.route('**/api/dashboard/stats', (r) => (fail ? r.fulfill({ status: 500, json: { error: 'x' } }) : r.continue()));
    await page.goto('/');
    await expect(page.getByText('Không tải được tổng quan')).toBeVisible({ timeout: 60_000 });
    fail = false;
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 30_000 });
  });
});

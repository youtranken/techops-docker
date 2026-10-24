/**
 * E2E — A1-4 khung app mới: sidebar theo quyền V1, ngăn kéo mobile, chuông thông báo.
 * Dữ liệu: user [E2E] (globalSetup), quyền menu + thông báo [E2E] chèn bằng SQL; dọn ở globalTeardown
 * (xoá user → cascade SidebarPermission/Notification; thêm xoá Notification title '[E2E]%').
 */
import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/auth';
import { E2E_USERS, psql } from './helpers/db';

const userId = (username: string) => psql(`SELECT id FROM "User" WHERE username='${username}';`);

/** Khoá các mục cấp 1/mục con đang hiện trong sidebar (data-nav), theo thứ tự */
async function navKeys(page: Page) {
  return page.locator('#app-sidebar [data-nav]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.nav));
}

function setMenus(username: string, menus: string[], features: Record<string, string[]> = {}) {
  const id = userId(username);
  psql(`
    DELETE FROM "SidebarPermission" WHERE "userId"='${id}';
    INSERT INTO "SidebarPermission"(id,"userId","visibleMenus","featurePermissions","createdAt","updatedAt")
    VALUES ('ce2esbperm${id.slice(-15)}','${id}','${JSON.stringify(menus)}','${JSON.stringify(features)}',
            now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC');
  `);
}

test.describe.serial('A1-4 — khung app', () => {
  test.describe.configure({ timeout: 240_000 }); // next dev biên dịch trang lần đầu khá chậm
  test('(a) nhân viên chỉ thấy menu được cấp; Boss/Admin thấy đủ (luật V1)', async ({ page }) => {
    // Nhân viên chưa có bản ghi quyền → API trả mặc định V1: logs, analytics, helpdesk, hr
    psql(`DELETE FROM "SidebarPermission" WHERE "userId"='${userId(E2E_USERS.emp.username)}';`);
    await login(page, E2E_USERS.emp.username);
    await page.goto('/tasks');
    await expect.poll(() => navKeys(page)).toEqual(['dashboard', 'tasks', 'helpdesk', 'analytics', 'hr', 'logs']);
    await expect(page.locator('#app-sidebar')).toContainText('Được cấp riêng');

    // Chỉ cấp Helpdesk + Cài đặt (Hồ sơ) → thấy đúng các mục đó
    setMenus(E2E_USERS.emp.username, ['helpdesk', 'settings'], { settings: ['profile'] });
    await page.reload();
    // V2: sidebar chỉ 1 mục Cài đặt (trang con nằm ở thanh điều hướng trong khu Cài đặt)
    await expect.poll(() => navKeys(page)).toEqual(['dashboard', 'tasks', 'helpdesk', 'settings']);
    // Không có ★ / Mới xong cho nhân viên
    await expect(page.getByRole('link', { name: /Quan trọng/ })).toHaveCount(0);

    // Không cấp gì → chỉ Tổng quan + Công việc
    setMenus(E2E_USERS.emp.username, []);
    await page.reload();
    await expect.poll(() => navKeys(page)).toEqual(['dashboard', 'tasks']);

    // Boss: đủ menu + ★/Mới xong; Cài đặt là 1 mục, thanh con trong trang có Báo cáo định kỳ, không có Bảo mật/SMTP (chỉ Admin)
    await login(page, E2E_USERS.boss.username);
    await page.goto('/settings/priorities');
    const setNav = page.getByTestId('set-nav');
    await expect(setNav.getByRole('link', { name: 'Báo cáo định kỳ' })).toBeVisible({ timeout: 60_000 });
    const boss = await navKeys(page);
    expect(boss).toEqual(['dashboard', 'tasks', 'tasks-important', 'tasks-unseen', 'helpdesk', 'analytics', 'hr', 'logs', 'settings']);
    await expect(setNav.getByRole('link', { name: 'Email (SMTP)' })).toHaveCount(0);
    await expect(setNav.getByRole('link', { name: 'Bảo mật' })).toHaveCount(0);
    // mục đang chọn tô theo route
    await expect(page.locator('#app-sidebar a[data-nav="settings"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Đường dẫn' })).toContainText('Mức ưu tiên');

    // Admin: có thêm Bảo mật + SMTP
    await login(page, E2E_USERS.admin.username);
    await page.goto('/settings/priorities');
    await expect(page.getByTestId('set-nav').getByRole('link', { name: 'Email (SMTP)' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('set-nav').getByRole('link', { name: 'Bảo mật' })).toBeVisible();

    // route con /tasks/[id] → tô "Công việc"
    await page.goto('/tasks/khong-ton-tai-e2e', { timeout: 90_000 });
    await expect(page.locator('#app-sidebar a[data-nav="tasks"]')).toHaveAttribute('aria-current', 'page');
  });

  test('(b) mobile 390: mở ngăn kéo → bấm menu → ngăn kéo tự đóng, trang đổi; không cuộn ngang', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, E2E_USERS.boss.username);
    await page.goto('/tasks');
    const sidebar = page.locator('#app-sidebar');
    await expect(sidebar).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    // Esc đóng
    await page.getByRole('button', { name: 'Mở menu' }).click();
    await expect(sidebar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();

    // Bấm mục menu → đổi trang + tự đóng
    await page.getByRole('button', { name: 'Mở menu' }).click();
    await expect(sidebar).toBeVisible();
    await sidebar.locator('a[data-nav="helpdesk"]').click();
    await expect(page).toHaveURL(/\/helpdesk$/, { timeout: 60_000 });
    await expect(sidebar).toBeHidden();

    // Mục con chỉ khác query (?view=important) cũng tự đóng
    await page.getByRole('button', { name: 'Mở menu' }).click();
    await sidebar.locator('a[data-nav="tasks-important"]').click();
    await expect(page).toHaveURL(/view=important/, { timeout: 60_000 });
    await expect(sidebar).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('(c) chuông: mở → thấy thông báo theo nhóm, tự đánh dấu đã đọc (V1); bấm → mở công việc', async ({ page }) => {
    const uid = userId(E2E_USERS.boss.username);
    const taskId = psql(`SELECT id FROM "Task" ORDER BY "createdAt" DESC LIMIT 1;`);
    psql(`
      DELETE FROM "Notification" WHERE "userId"='${uid}';
      INSERT INTO "Notification"(id,"userId","taskId",type,title,message,"isRead","createdAt") VALUES
        ('ce2enotif00000000000000a1','${uid}','${taskId}','TASK_ASSIGNED','[E2E] Thông báo hôm nay','Nội dung A',false, now() AT TIME ZONE 'UTC'),
        ('ce2enotif00000000000000a2','${uid}',NULL,'DEADLINE_REMINDER','[E2E] Thông báo cũ','Nội dung B',false, (now() AT TIME ZONE 'UTC') - interval '3 days');
    `);
    await login(page, E2E_USERS.boss.username);
    await page.goto('/tasks');
    const bell = page.getByRole('button', { name: /^Thông báo/ });
    await expect(bell).toHaveAccessibleName(/2 chưa đọc/, { timeout: 20_000 });

    await bell.click();
    const pop = page.getByRole('dialog', { name: 'Thông báo' });
    await expect(pop).toBeVisible();
    await expect(pop.getByRole('region', { name: 'Hôm nay' })).toContainText('[E2E] Thông báo hôm nay', { timeout: 60_000 }); // lần đầu next dev biên dịch API
    await expect(pop.getByRole('region', { name: 'Trước đó' })).toContainText('[E2E] Thông báo cũ');
    // mục mới vẫn có chấm "chưa đọc" trong lần mở này
    await expect(pop.locator('[data-unread]')).toHaveCount(2);

    // V1: mở chuông = đánh dấu đã đọc hết (POST /api/notifications/read-all)
    await expect.poll(() => psql(`SELECT count(*) FROM "Notification" WHERE "userId"='${uid}' AND NOT "isRead";`)).toBe('0');
    await expect(bell).toHaveAccessibleName('Thông báo');

    // Esc đóng, mở lại
    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();
    await bell.click();
    await expect(pop).toBeVisible();

    // Bấm thông báo có công việc → mở trang chi tiết, dropdown đóng
    await pop.getByRole('button', { name: /\[E2E\] Thông báo hôm nay/ }).click();
    await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}$`), { timeout: 60_000 });
    await expect(pop).toBeHidden();
  });
});

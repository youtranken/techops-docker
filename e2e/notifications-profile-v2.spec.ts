/**
 * E2E — A3-2: trang Thông báo + Hồ sơ của tôi.
 *  (a) thông báo sinh từ hành động thật (Boss giao việc cho Nhân viên [E2E]) → hiện ở chuông và trang /notifications
 *      → đánh dấu 1 / bấm mở việc / đọc tất cả → DB đổi đúng; chuông có "Xem tất cả".
 *  (b) sửa hồ sơ → DB đổi; lỗi kiểm tra hiện dưới ô; Hoàn tác.
 *  (c) đổi mật khẩu: sai luật / sai mật khẩu hiện tại → lỗi; đúng → đăng nhập lại bằng mật khẩu mới (user [E2E] riêng).
 *  (d) mobile 390: không cuộn ngang, nút chạm ≥ 44px.
 * Dữ liệu [E2E] dọn ở globalTeardown (user e2e_pw nằm trong E2E_EXTRA_USERNAMES).
 */
import bcrypt from 'bcryptjs';
import { test, expect, type Page, type Cookie } from '@playwright/test';
import { api } from './helpers/auth';
import { E2E_USERS, E2E_PASSWORD, psql } from './helpers/db';
import { refs, createTask } from './helpers/seed';

const RUN = `NP${Date.now().toString(36)}`;
const PW_USER = 'e2e_pw';
const NEW_PASSWORD = 'Moi!Passw0rd#A32';
const uid = (u: string) => psql(`SELECT id FROM "User" WHERE username='${u}';`);
const sessions: Record<string, Cookie[]> = {};

/** Đăng nhập (V1 giới hạn 5 lần/phút/IP → bị chặn thì chờ 1 phút rồi thử lại 1 lần). */
async function signIn(page: Page, username: string, password = E2E_PASSWORD) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
      return;
    } catch (e) {
      if (attempt) throw e;
      await page.waitForTimeout(61_000);
    }
  }
}
async function as(page: Page, who: string) {
  await page.context().clearCookies();
  await page.context().addCookies(sessions[who]);
}
function grantProfile(username: string) {
  const id = uid(username);
  psql(`DELETE FROM "SidebarPermission" WHERE "userId"='${id}';
    INSERT INTO "SidebarPermission"(id,"userId","visibleMenus","featurePermissions","createdAt","updatedAt")
    VALUES ('ce2enp${id.slice(-19)}','${id}','["settings"]','{"settings":["profile"]}', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC');`);
}
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe.serial('A3-2 — Thông báo + Hồ sơ', () => {
  test.describe.configure({ timeout: 240_000 });
  const taskIds: string[] = [];

  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(240_000);
    // user riêng cho kịch bản đổi mật khẩu
    const hash = await bcrypt.hash(E2E_PASSWORD, 10);
    psql(`DELETE FROM "User" WHERE username='${PW_USER}';
      INSERT INTO "User"(id, username, password, "displayName", "roleId", "isActive", "mustChangePassword", "passwordChangedAt", "emailVerifiedAt", "createdAt", "updatedAt")
      SELECT 'ce2epw000000000000000000a', '${PW_USER}', '${hash}', '[E2E] Đổi mật khẩu', r.id, true, false,
             now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
      FROM "Role" r WHERE r.name='EMPLOYEE';`);
    grantProfile(E2E_USERS.emp.username);
    grantProfile(PW_USER);
    psql(`DELETE FROM "Notification" WHERE "userId"='${uid(E2E_USERS.emp.username)}';`);

    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    await signIn(page, E2E_USERS.boss.username);
    // Hành động thật: Boss giao 3 việc (Trực tiếp) cho nhân viên → V1 tạo 3 thông báo TASK_ASSIGNED
    const r = await refs(page);
    for (const k of [1, 2, 3]) {
      taskIds.push(await createTask(page, { title: `[E2E] ${RUN} việc ${k}`, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId] }, r));
    }
    await signIn(page, E2E_USERS.emp.username);
    sessions.emp = await page.context().cookies();
    await signIn(page, PW_USER);
    sessions.pw = await page.context().cookies();
    await page.close();
  });

  test('(a) thông báo từ việc được giao: chuông + trang, đánh dấu đã đọc / đọc tất cả → DB', async ({ page }) => {
    const emp = uid(E2E_USERS.emp.username);
    const nid = (taskId: string) => psql(`SELECT id FROM "Notification" WHERE "userId"='${emp}' AND "taskId"='${taskId}' AND type='TASK_ASSIGNED';`);
    const isRead = (id: string) => psql(`SELECT "isRead" FROM "Notification" WHERE id='${id}';`);
    const unreadCount = () => psql(`SELECT count(*) FROM "Notification" WHERE "userId"='${emp}' AND NOT "isRead";`);
    expect(await unreadCount()).toBe('3');
    const [n1, n2, n3] = taskIds.map(nid);

    await as(page, 'emp');
    await page.goto('/tasks');
    await expect(page.getByRole('button', { name: /^Thông báo/ })).toHaveAccessibleName(/3 chưa đọc/, { timeout: 30_000 });

    // Trang thông báo: đủ 3 dòng chưa đọc, nhóm "Hôm nay", tiêu đề/nội dung V1
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { level: 1, name: 'Thông báo' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Đường dẫn' })).toContainText('Thông báo');
    const box = page.getByTestId('nt-box');
    await expect(box.locator('section[data-group="today"]')).toBeVisible({ timeout: 60_000 });
    await expect(box.locator('li[data-unread]')).toHaveCount(3);
    await expect(page.getByTestId('nt-sub')).toHaveText('3 thông báo chưa đọc');
    await expect(box.locator(`li[data-nid="${n1}"]`)).toContainText(`${RUN} việc 1`);
    await expect(box.getByText('Giao việc').first()).toBeVisible(); // nhãn nhóm
    await expect(page.getByTestId('nt-end')).toBeVisible(); // 3 < 20 → hết

    // Đánh dấu 1 thông báo
    await box.locator(`li[data-nid="${n1}"]`).getByRole('button', { name: 'Đánh dấu đã đọc' }).click();
    await expect.poll(() => isRead(n1)).toBe('t');
    await expect(box.locator(`li[data-nid="${n1}"]`)).not.toHaveAttribute('data-unread');
    expect(await isRead(n2)).toBe('f');

    // Tab Chưa đọc: còn 2
    await page.getByRole('tab', { name: /Chưa đọc/ }).click();
    await expect(box.locator('li')).toHaveCount(2);

    // Bấm dòng → đánh dấu đã đọc + mở công việc (như dropdown V1)
    await box.locator(`li[data-nid="${n2}"] a`).click();
    await expect(page).toHaveURL(new RegExp(`/tasks/${taskIds[1]}$`), { timeout: 60_000 });
    await expect.poll(() => isRead(n2)).toBe('t');

    // Đọc tất cả
    await page.goto('/notifications');
    await expect(box.locator('li[data-unread]')).toHaveCount(1, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
    await expect.poll(unreadCount).toBe('0');
    expect(await isRead(n3)).toBe('t');
    await expect(page.getByText('Đã đánh dấu 1 thông báo là đã đọc')).toBeVisible();
    await expect(box.locator('li[data-unread]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' })).toBeDisabled();
    await page.getByRole('tab', { name: /Chưa đọc/ }).click();
    await expect(box).toContainText('Bạn đã đọc hết thông báo');

    // Chuông: thấy thông báo, chân có "Xem tất cả" → về trang
    await page.goto('/tasks');
    await page.getByRole('button', { name: /^Thông báo/ }).click();
    const pop = page.getByRole('dialog', { name: 'Thông báo' });
    await expect(pop).toContainText(`${RUN} việc 3`, { timeout: 30_000 });
    await pop.getByRole('link', { name: 'Xem tất cả thông báo' }).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(pop).toBeHidden();
  });

  test('(b) sửa hồ sơ → DB đổi; lỗi kiểm tra dưới ô; Hoàn tác', async ({ page }) => {
    const emp = uid(E2E_USERS.emp.username);
    await as(page, 'emp');
    await page.goto('/settings/profile');
    await expect(page.getByRole('heading', { level: 1, name: 'Hồ sơ của tôi' })).toBeVisible();
    await expect(page.getByTestId('pf-acc-user')).toHaveText(E2E_USERS.emp.username, { timeout: 60_000 });
    const bar = page.getByRole('region', { name: 'Có thay đổi chưa lưu' });
    await expect(bar).toHaveCount(0);

    // Lỗi kiểm tra: tên rỗng + email sai → không gọi API, lỗi dưới ô, focus ô đầu
    await page.locator('#pf-name').fill('');
    await page.locator('#pf-email').fill('sai-email');
    await expect(bar).toBeVisible();
    await bar.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.locator('#pf-name-err')).toHaveText('Nhập tên hiển thị');
    await expect(page.locator('#pf-email-err')).toContainText('Email chưa đúng định dạng');
    await expect(page.locator('#pf-name')).toBeFocused();
    await expect(page.locator('#pf-name')).toHaveAttribute('aria-invalid', 'true');
    expect(psql(`SELECT "displayName" FROM "User" WHERE id='${emp}';`)).toBe(E2E_USERS.emp.displayName);

    // Hoàn tác → về giá trị cũ, thanh lưu ẩn
    await bar.getByRole('button', { name: 'Hoàn tác' }).click();
    await expect(page.locator('#pf-name')).toHaveValue(E2E_USERS.emp.displayName);
    await expect(bar).toHaveCount(0);

    // Sửa đúng → 2 lần PATCH như V1 (cơ bản + liên hệ) → DB
    const name = `[E2E] Nhân viên ${RUN}`;
    await page.locator('#pf-name').fill(name);
    await page.locator('#pf-pos').fill('Kỹ sư hỗ trợ IT');
    await page.locator('#pf-tz').selectOption('Asia/Tokyo');
    await page.locator('#pf-email').fill('e2e.np@pmh.com.vn');
    await page.locator('#pf-phone').fill('0912 345 678');
    await bar.getByRole('button', { name: 'Lưu' }).click();
    await expect(bar).toHaveCount(0, { timeout: 30_000 });
    expect(psql(`SELECT "displayName"||'|'||coalesce(email,'') FROM "User" WHERE id='${emp}';`)).toBe(`${name}|e2e.np@pmh.com.vn`);
    expect(psql(`SELECT position||'|'||timezone||'|'||phone FROM "UserProfile" WHERE "userId"='${emp}';`)).toBe('Kỹ sư hỗ trợ IT|Asia/Tokyo|0912 345 678');
    // tên mới lên khung app
    await expect(page.getByRole('button', { name: new RegExp(RUN) })).toBeVisible();

    // Màu nền lưu ngay (V1)
    const red = page.getByRole('radio', { name: 'Màu #EF4444' });
    await red.click({ force: true }); // ô radio trong suốt phủ lên chấm màu
    await expect.poll(() => psql(`SELECT "avatarColor" FROM "UserProfile" WHERE "userId"='${emp}';`)).toBe('#EF4444');
    await expect(red).toBeChecked();

    // Ảnh sai định dạng → lỗi ngay dưới nút, không gọi API
    await page.getByTestId('pf-file').setInputFiles({ name: 'so-do.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    await expect(page.getByTestId('pf-file-err')).toContainText('không phải ảnh JPG hoặc PNG');
  });

  test('(c) đổi mật khẩu: sai luật / sai mật khẩu hiện tại → lỗi; đúng → đăng nhập lại được', async ({ page }) => {
    const pwId = uid(PW_USER);
    await as(page, 'pw');
    await page.goto('/settings/profile');
    await page.getByTestId('pf-pw-btn').click({ timeout: 60_000 });
    const dlg = page.getByTestId('pw-dialog');
    await expect(dlg).toBeVisible();
    const ok = dlg.getByRole('button', { name: 'Đổi mật khẩu' });

    // trống → 3 lỗi
    await ok.click();
    await expect(dlg.locator('#pw-cur-err')).toHaveText('Nhập mật khẩu hiện tại');
    await expect(dlg.locator('#pw-new-err')).toHaveText('Nhập mật khẩu mới');
    await expect(dlg.locator('#pw-confirm-err')).toHaveText('Nhập lại mật khẩu mới');

    // sai luật + không khớp (kiểm ở client, không gọi API)
    await dlg.locator('#pw-cur').fill(E2E_PASSWORD);
    await dlg.locator('#pw-new').fill('abc');
    await dlg.locator('#pw-confirm').fill('abd');
    await ok.click();
    await expect(dlg.locator('#pw-new-err')).toContainText('chưa đạt đủ yêu cầu');
    await expect(dlg.locator('#pw-confirm-err')).toContainText('chưa khớp');
    await expect(dlg.getByTestId('pw-policy').locator('li[data-ok]')).toHaveCount(1); // chỉ "chữ thường" đạt

    // đủ luật nhưng mật khẩu hiện tại sai → lỗi server dưới ô hiện tại
    await dlg.locator('#pw-cur').fill('Sai!Passw0rd');
    await dlg.locator('#pw-new').fill(NEW_PASSWORD);
    await dlg.locator('#pw-confirm').fill(NEW_PASSWORD);
    await ok.click();
    await expect(dlg.locator('#pw-cur-err')).toHaveText('Mật khẩu hiện tại không đúng.', { timeout: 30_000 });

    // đúng
    const before = psql(`SELECT password FROM "User" WHERE id='${pwId}';`);
    await dlg.locator('#pw-cur').fill(E2E_PASSWORD);
    await ok.click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText('Đã đổi mật khẩu.')).toBeVisible();
    expect(psql(`SELECT password FROM "User" WHERE id='${pwId}';`)).not.toBe(before);

    // đăng nhập lại bằng mật khẩu mới
    await signIn(page, PW_USER, NEW_PASSWORD);
    const me = await api<{ username: string }>(page, '/api/settings/profile');
    expect(me.json.username).toBe(PW_USER);
  });

  test('(d) mobile 390: trang Thông báo + Hồ sơ không cuộn ngang, nút chạm ≥ 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await as(page, 'emp');
    // thêm 1 thông báo chưa đọc để có nút chấm
    psql(`UPDATE "Notification" SET "isRead"=false WHERE id=(SELECT id FROM "Notification" WHERE "userId"='${uid(E2E_USERS.emp.username)}' ORDER BY "createdAt" DESC LIMIT 1);`);
    await page.goto('/notifications');
    const box = page.getByTestId('nt-box');
    await expect(box.locator('li').first()).toBeVisible({ timeout: 60_000 });
    expect(await noHScroll(page)).toBe(true);
    const dot = box.getByRole('button', { name: 'Đánh dấu đã đọc' }).first();
    const bb = await dot.boundingBox();
    expect(bb!.height).toBeGreaterThanOrEqual(44);
    expect(bb!.width).toBeGreaterThanOrEqual(44);
    for (const name of ['Đánh dấu tất cả đã đọc']) {
      expect((await page.getByRole('button', { name }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }

    await page.goto('/settings/profile');
    await expect(page.locator('#pf-name')).toBeVisible({ timeout: 60_000 });
    expect(await noHScroll(page)).toBe(true);
    expect((await page.locator('#pf-name').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await page.getByTestId('pf-pw-btn').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.locator('#pf-pos').fill('Thử mobile');
    const bar = page.getByRole('region', { name: 'Có thay đổi chưa lưu' });
    await expect(bar).toBeVisible();
    expect(await noHScroll(page)).toBe(true);
    await bar.getByRole('button', { name: 'Hoàn tác' }).click();
  });
});

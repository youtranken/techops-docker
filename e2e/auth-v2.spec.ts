/**
 * E2E — A3-8: Đăng nhập + Mật khẩu (giao diện V2, nghiệp vụ V1).
 *  (a) đăng nhập: lỗi dưới ô khi trống; sai mật khẩu / không có tài khoản / IP đang bị khoá → CÙNG một câu chung (chống dò tài khoản)
 *  (b) callbackUrl: đường dẫn nội bộ → tới đúng trang; URL ngoài / "//host" → về "/" (không open-redirect)
 *  (c) đổi ngôn ngữ VI/EN + sáng/tối ngay trên trang đăng nhập
 *  (d) đổi mật khẩu lần đầu (mustChangePassword): sai mật khẩu hiện tại / chưa đạt chính sách / không khớp → lỗi; đúng → DB đổi,
 *      "Đăng nhập lại" → đăng nhập bằng mật khẩu mới vào thẳng app
 *  (e) đặt lại mật khẩu qua link: thiếu token / hết hạn / lỗi mạng + Thử lại / đặt thành công → 3 giây về /login, token bị huỷ
 *  (f) xác nhận email: token thật qua API V1 → "Đã xác nhận email" + DB; các mã lỗi V1
 *  (g) 390px: không cuộn ngang, ô/nút chạm ≥ 42px (ô nhập + nút chính 44px)
 * Mọi lần đăng nhập đi qua IP giả E2E_AUTH_IP (x-real-ip) → khoá giới hạn đăng nhập chỉ của IP này, xoá trước/sau.
 * User riêng e2e_auth / e2e_auth1st (E2E_EXTRA_USERNAMES) — globalTeardown dọn. Token Redis tạo ở đây được xoá ở afterAll.
 */
import { test, expect, type Page, type Browser } from '@playwright/test';
import { E2E_PASSWORD, psql } from './helpers/db';
import { redis, clearLoginLock, upsertAuthUser, E2E_AUTH_HEADERS, E2E_AUTH_IP } from './helpers/redis';

const NEW_PW = 'Moi!Passw0rd#A38';
const RUN = Date.now().toString(36);
const tokens: string[] = [];
const GENERIC = 'Sai tên đăng nhập hoặc mật khẩu.';

async function open(browser: Browser, baseURL: string, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ baseURL, viewport, extraHTTPHeaders: E2E_AUTH_HEADERS, locale: 'vi-VN' });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90_000);
  return page;
}
async function submitLogin(page: Page, username: string, password: string, url = '/login') {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const DB_USER = (u: string, col: string) => psql(`SELECT "${col}" FROM "User" WHERE username='${u}';`);

test.describe.serial('A3-8 — Đăng nhập + Mật khẩu', () => {
  test.describe.configure({ timeout: 180_000 });
  let uid = '';

  test.beforeAll(async () => {
    uid = await upsertAuthUser('e2e_auth', { email: `e2e_auth_${RUN}@example.test` });
    const id1st = await upsertAuthUser('e2e_auth1st', { mustChangePassword: true });
    // giới hạn đổi mật khẩu 5 lần/giờ/người (V1) — chỉ khoá của 2 user E2E này
    redis('DEL', `ratelimit:changepw:${uid}`, `ratelimit:changepw:${id1st}`);
    clearLoginLock();
  });
  test.afterAll(() => {
    clearLoginLock();
    for (const k of tokens) redis('DEL', k);
    // log LOGIN_FAILED của tên đăng nhập không tồn tại (userId null) do spec này tạo
    psql(`DELETE FROM "UserActivityLog" WHERE "userId" IS NULL AND "ipAddress"='${E2E_AUTH_IP}';`);
  });

  test('(a) lỗi đăng nhập: dưới ô khi trống; sai / không có tài khoản / bị khoá → cùng một câu chung', async ({ browser }, info) => {
    const page = await open(browser, info.project.use.baseURL!);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle('TechOps · Đăng nhập');
    await expect(page.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeVisible();
    const user = page.getByLabel('Tên đăng nhập');
    const pass = page.locator('#password');
    await expect(user).toHaveAttribute('autocomplete', 'username');
    await expect(pass).toHaveAttribute('autocomplete', 'current-password');
    // trống → lỗi dưới ô, focus ô đầu
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByText('Nhập tên đăng nhập')).toBeVisible();
    await expect(page.getByText('Nhập mật khẩu', { exact: true })).toBeVisible();
    await expect(user).toBeFocused();
    await expect(user).toHaveAttribute('aria-invalid', 'true');
    // hiện / ẩn mật khẩu
    await pass.fill('abc');
    await page.getByRole('button', { name: 'Hiện mật khẩu' }).click();
    await expect(pass).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ẩn mật khẩu' }).click();
    await expect(pass).toHaveAttribute('type', 'password');
    // "Quên mật khẩu?" chỉ hiện hướng dẫn (không gọi API)
    await page.getByRole('button', { name: 'Quên mật khẩu?' }).click();
    await expect(page.getByText('Nhờ Vice Manager hoặc Admin gửi link đặt lại mật khẩu')).toBeVisible();

    const texts: string[] = [];
    // sai mật khẩu
    await submitLogin(page, 'e2e_auth', 'Sai!Matkhau1');
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 20_000 });
    texts.push((await page.getByTestId('login-error').innerText()).trim());
    await expect(pass).toHaveValue('');
    await expect(pass).toBeFocused();
    // tài khoản không tồn tại
    await submitLogin(page, `e2e_khongco_${RUN}`, 'Sai!Matkhau1');
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 20_000 });
    texts.push((await page.getByTestId('login-error').innerText()).trim());
    // IP đang bị khoá (V1: lockout:<ip> sau 5 lần sai) → đúng mật khẩu vẫn chỉ thấy câu chung
    clearLoginLock();
    redis('SETEX', `lockout:${E2E_AUTH_IP}`, '120', '1');
    await submitLogin(page, 'e2e_auth', E2E_PASSWORD);
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 20_000 });
    texts.push((await page.getByTestId('login-error').innerText()).trim());
    await expect(page).toHaveURL(/\/login/);
    clearLoginLock();
    // tài khoản bị vô hiệu hoá → cũng câu chung
    psql(`UPDATE "User" SET "isActive"=false WHERE username='e2e_auth';`);
    await submitLogin(page, 'e2e_auth', E2E_PASSWORD);
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 20_000 });
    texts.push((await page.getByTestId('login-error').innerText()).trim());
    psql(`UPDATE "User" SET "isActive"=true WHERE username='e2e_auth';`);
    clearLoginLock();
    expect(new Set(texts)).toEqual(new Set([GENERIC]));
    await page.context().close();
  });

  test('(b) callbackUrl: nội bộ → đúng trang; URL ngoài / "//host" → "/"', async ({ browser }, info) => {
    const base = info.project.use.baseURL!;
    const host = new URL(base).host;
    for (const [cb, expectPath] of [['/notifications', /\/notifications$/], ['https://example.com/x', null], ['//example.com/y', null]] as const) {
      const page = await open(browser, base);
      let external = false;
      await page.route((u) => u.hostname === 'example.com', (r) => { external = true; return r.fulfill({ status: 200, body: 'EXTERNAL' }); });
      await submitLogin(page, 'e2e_auth', E2E_PASSWORD, `/login?callbackUrl=${encodeURIComponent(cb)}`);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      expect(new URL(page.url()).host).toBe(host);
      expect(external).toBe(false);
      if (expectPath) await expect(page).toHaveURL(expectPath);
      await page.context().close();
    }
  });

  test('(c) đổi ngôn ngữ + sáng/tối trên trang đăng nhập', async ({ browser }, info) => {
    const page = await open(browser, info.project.use.baseURL!);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByRole('group', { name: 'Ngôn ngữ' }).getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel('Username')).toBeVisible();
    await page.getByRole('button', { name: /^Appearance: Dark/ }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: /^Appearance: Light/ }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'Tiếng Việt' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeVisible({ timeout: 20_000 });
    await page.context().close();
  });

  test('(d) đổi mật khẩu lần đầu: lỗi đúng ô → đổi thành công → đăng nhập lại bằng mật khẩu mới', async ({ browser }, info) => {
    const page = await open(browser, info.project.use.baseURL!);
    await submitLogin(page, 'e2e_auth1st', E2E_PASSWORD);
    await expect(page).toHaveURL(/\/change-password/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Đặt mật khẩu của riêng bạn' })).toBeVisible();
    const cur = page.getByLabel('Mật khẩu hiện tại');
    const nw = page.getByLabel('Mật khẩu mới', { exact: true });
    const cf = page.getByLabel('Nhập lại mật khẩu mới');
    await expect(nw).toHaveAttribute('autocomplete', 'new-password');
    const save = page.getByRole('button', { name: 'Lưu mật khẩu và tiếp tục' });
    // trống
    await save.click();
    await expect(cur).toBeFocused();
    await expect(page.getByText('Nhập mật khẩu hiện tại')).toBeVisible();
    // chưa đạt chính sách + không khớp
    await cur.fill(E2E_PASSWORD);
    await nw.fill('abc');
    await cf.fill('abd');
    await expect(page.getByTestId('pw-policy').locator('li[data-ok]')).toHaveCount(1); // chỉ "chữ thường"
    await save.click();
    await expect(page.getByText('Mật khẩu mới chưa đạt đủ yêu cầu bên dưới.')).toBeVisible();
    await expect(page.getByText('Hai mật khẩu chưa khớp.')).toBeVisible();
    await expect(nw).toBeFocused();
    // sai mật khẩu hiện tại (server WRONG_PASSWORD)
    await cur.fill('Sai!Matkhau1');
    await nw.fill(NEW_PW);
    await cf.fill(NEW_PW);
    await save.click();
    await expect(page.getByText('Mật khẩu hiện tại không đúng.')).toBeVisible({ timeout: 20_000 });
    await expect(cur).toHaveValue('');
    expect(DB_USER('e2e_auth1st', 'mustChangePassword')).toBe('t');
    // đúng
    await cur.fill(E2E_PASSWORD);
    await save.click();
    await expect(page.getByTestId('first-ok')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Đã đổi mật khẩu' })).toBeFocused();
    expect(DB_USER('e2e_auth1st', 'mustChangePassword')).toBe('f');
    await page.getByRole('button', { name: 'Đăng nhập lại' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    // mật khẩu cũ không còn dùng được; mật khẩu mới vào thẳng app (không bị đẩy lại /change-password)
    await submitLogin(page, 'e2e_auth1st', NEW_PW);
    await expect(page).not.toHaveURL(/\/login|\/change-password/, { timeout: 30_000 });
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/notifications/);
    clearLoginLock();
    await page.context().close();
  });

  test('(e) đặt lại mật khẩu qua link: thiếu / hết hạn / lỗi mạng / thành công', async ({ browser }, info) => {
    const page = await open(browser, info.project.use.baseURL!);
    await page.goto('/reset-password');
    await expect(page.getByTestId('reset-bad')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Link không hợp lệ' })).toBeVisible();
    await page.goto(`/reset-password?token=khongcon_${RUN}`);
    await expect(page.getByTestId('reset-expired')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Về trang đăng nhập' })).toHaveAttribute('href', '/login');

    const tok = `e2e${RUN}reset`;
    tokens.push(`pwd_reset:${tok}`);
    redis('SETEX', `pwd_reset:${tok}`, '600', `${uid}:reset`);
    // lỗi mạng khi kiểm tra → Thử lại gọi lại đúng API kiểm tra
    await page.route('**/api/auth/reset-password/check**', (r) => r.abort());
    await page.goto(`/reset-password?token=${tok}`);
    await expect(page.getByTestId('reset-net')).toBeVisible({ timeout: 20_000 });
    await page.unroute('**/api/auth/reset-password/check**');
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Đặt lại mật khẩu' })).toBeVisible({ timeout: 20_000 });

    const nw = page.getByLabel('Mật khẩu mới', { exact: true });
    const cf = page.getByLabel('Nhập lại mật khẩu mới');
    await nw.fill('abc');
    await cf.fill('abc');
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await expect(page.getByText('Mật khẩu mới chưa đạt đủ yêu cầu bên dưới.')).toBeVisible();
    await nw.fill(NEW_PW);
    await cf.fill(NEW_PW);
    const req = page.waitForRequest((r) => r.url().endsWith('/api/auth/reset-password') && r.method() === 'POST');
    await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    expect((await req).postDataJSON()).toEqual({ token: tok, newPassword: NEW_PW }); // body V1
    await expect(page.getByTestId('reset-ok')).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 }); // V1: 3 giây tự về /login
    expect(redis('EXISTS', `pwd_reset:${tok}`)).toBe('0');
    // dùng lại link → hết hạn
    await page.goto(`/reset-password?token=${tok}`);
    await expect(page.getByTestId('reset-expired')).toBeVisible({ timeout: 20_000 });
    // mật khẩu mới đăng nhập được
    await submitLogin(page, 'e2e_auth', NEW_PW);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    clearLoginLock();
    await page.context().close();
  });

  test('(f) xác nhận email: token thật → đã xác nhận + DB; các mã lỗi V1', async ({ browser }, info) => {
    const page = await open(browser, info.project.use.baseURL!);
    await submitLogin(page, 'e2e_auth', NEW_PW);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    psql(`UPDATE "User" SET "emailVerifiedAt"=NULL WHERE username='e2e_auth';`);
    const tok = `e2e${RUN}verify`;
    tokens.push(`email_verify:${tok}`);
    redis('SETEX', `email_verify:${tok}`, '600', `${uid}:e2e_auth_${RUN}@example.test`);
    await page.goto(`/api/auth/verify-email?token=${tok}`);
    await expect(page).toHaveURL(/\/verify-email\?success=1/);
    await expect(page.getByRole('heading', { level: 1, name: 'Đã xác nhận email' })).toBeVisible();
    await expect(page).toHaveTitle('TechOps · Xác nhận email');
    expect(DB_USER('e2e_auth', 'emailVerifiedAt')).not.toBe('');
    await page.goto(`/api/auth/verify-email?token=${tok}`); // token đã dùng
    await expect(page.getByTestId('vf-expired')).toBeVisible();
    for (const [q, id] of [['error=missing_token', 'vf-missing'], ['error=email_changed', 'vf-changed'], ['error=xyz', 'vf-unknown'], ['', 'vf-busy']] as const) {
      await page.goto(`/verify-email${q ? `?${q}` : ''}`);
      await expect(page.getByTestId(id)).toBeVisible();
    }
    await page.goto('/verify-email?error=missing_token');
    await expect(page.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/');
    await page.context().close();
  });

  test('(g) 390px: không cuộn ngang, ô/nút chạm đủ lớn', async ({ browser }, info) => {
    const page = await open(browser, info.project.use.baseURL!, { width: 390, height: 844 });
    for (const url of ['/login', '/reset-password', `/reset-password?token=khongcon_${RUN}`]) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      expect(await noHScroll(page), url).toBe(true);
    }
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    for (const loc of [page.getByLabel('Tên đăng nhập'), page.locator('#password'), page.getByRole('button', { name: 'Đăng nhập', exact: true }), page.getByRole('button', { name: 'Hiện mật khẩu' })]) {
      const b = await loc.boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(42);
    }
    await page.context().close();
  });
});

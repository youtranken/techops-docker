/**
 * E2E — V2 A2-2: hộp thoại hành động công việc (khung ActionDialog, song ngữ).
 * Hành vi giữ nguyên V1: cùng endpoint/payload; kiểm trạng thái DB sau mỗi bước.
 * Dữ liệu tiền tố [E2E] (tạo qua API V1), dọn ở globalTeardown + afterAll (mẫu hoàn thành, tệp tải lên).
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/auth';
import { E2E_USERS, psql } from './helpers/db';
import { refs, createTask, call } from './helpers/seed';

const RUN = Date.now().toString(36);
const TPL = `[E2E] Đã thay linh kiện và chạy thử ổn định ${RUN}.`;
let ids: { main: string; decline: string; ext: string; cancel: string };

const taskStatus = (id: string) => psql(`SELECT status FROM "Task" WHERE id='${id}'`);
const empStatus = (id: string) => psql(`SELECT a.status FROM "TaskAssignee" a JOIN "User" u ON u.id=a."userId" WHERE a."taskId"='${id}' AND u.username='${E2E_USERS.emp.username}'`);
const main = (page: Page, k: string) => page.locator(`[data-action="${k}"]:visible`).first();
async function more(page: Page, label: string) {
  await page.getByRole('button', { name: 'Thao tác khác' }).locator('visible=true').first().click();
  await page.getByRole('menuitem', { name: label }).click();
}
async function open(page: Page, id: string) {
  await page.goto(`/tasks/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 });
}
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

test.describe.serial('V2 — hộp thoại hành động', () => {
  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(180_000);
    const page = await browser.newPage({ baseURL: info.project.use.baseURL });
    await login(page, E2E_USERS.boss.username);
    const r = await refs(page);
    const decline = await createTask(page, { title: `[E2E] A2-2 Từ chối ${RUN}`, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId] }, r);
    const ext = await createTask(page, { title: `[E2E] A2-2 Gia hạn ${RUN}`, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
    const cancel = await createTask(page, { title: `[E2E] A2-2 Hủy ${RUN}`, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId] }, r);
    await call(page, '/api/settings/completion-templates', 'POST', { title: `[E2E] Mẫu A2-2 ${RUN}`, content: TPL, category: 'E2E' });
    await login(page, E2E_USERS.emp.username);
    const mainId = await createTask(page, { title: `[E2E] A2-2 Luồng chính ${RUN}`, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
    await call(page, `/api/tasks/${ext}/acknowledge`);
    await page.close();
    ids = { main: mainId, decline, ext, cancel };
  });

  test.afterAll(() => {
    psql(`DELETE FROM "ReportTemplate" WHERE title LIKE '[E2E]%';`);
    for (const id of Object.values(ids ?? {})) fs.rmSync(path.resolve('uploads', id), { recursive: true, force: true });
  });

  test('(1) Boss duyệt kế hoạch → Chờ nhận việc', async ({ page }) => {
    await login(page, E2E_USERS.boss.username);
    await open(page, ids.main);
    await main(page, 'approve-plan').click();
    const dlg = page.getByRole('dialog', { name: 'Duyệt công việc này?' });
    await expect(dlg.getByTestId('dlg-task')).toContainText(`[E2E] A2-2 Luồng chính ${RUN}`);
    await expect(dlg).toContainText('Chờ nhận việc');
    await dlg.getByRole('button', { name: 'Duyệt' }).click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => taskStatus(ids.main)).toBe('WAITING_ACKNOWLEDGE');
  });

  test('(2) Nhân viên nhận việc → Đang làm', async ({ page }) => {
    await login(page, E2E_USERS.emp.username);
    await open(page, ids.main);
    await main(page, 'acknowledge').click();
    const dlg = page.getByRole('dialog', { name: 'Nhận công việc này?' });
    await expect(dlg.getByRole('button', { name: 'Đóng', exact: true })).toBeVisible();
    await dlg.getByRole('button', { name: 'Nhận việc' }).click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => taskStatus(ids.main)).toBe('IN_PROGRESS');
    expect(empStatus(ids.main)).toBe('IN_PROGRESS');
  });

  test('(3) Nhân viên từ chối nhận: bắt buộc lý do (V1) → REJECTED', async ({ page }) => {
    await login(page, E2E_USERS.emp.username);
    await open(page, ids.decline);
    await main(page, 'reject-task').click();
    const dlg = page.getByRole('dialog', { name: 'Từ chối nhận việc?' });
    const ta = dlg.getByRole('textbox', { name: /Lý do/ });
    await expect(ta).toBeFocused();
    await dlg.getByRole('button', { name: 'Từ chối' }).click();
    await expect(dlg.getByText('Nhập lý do.')).toBeVisible();
    await expect(ta).toHaveAttribute('aria-invalid', 'true');
    expect(empStatus(ids.decline)).toBe('PENDING');
    await ta.fill('[E2E] Đang xử lý việc khẩn khác');
    await dlg.getByRole('button', { name: 'Từ chối' }).click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => empStatus(ids.decline)).toBe('REJECTED');
    expect(psql(`SELECT a."transferNotes" FROM "TaskAssignee" a WHERE a."taskId"='${ids.decline}'`)).toBe('[E2E] Đang xử lý việc khẩn khác');
  });

  test('(4) Nhân viên báo cáo xong: chọn mẫu + đính kèm → Chờ nghiệm thu', async ({ page }) => {
    await login(page, E2E_USERS.emp.username);
    await open(page, ids.main);
    await main(page, 'complete').click();
    const dlg = page.getByRole('dialog', { name: 'Báo cáo xong việc' });
    await expect(dlg).toContainText('phiên bản v1.0');
    await expect(dlg).toContainText('Chờ nghiệm thu');
    const ta = dlg.getByRole('textbox', { name: /Nội dung báo cáo/ });
    await ta.fill('ngắn');
    await dlg.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await expect(dlg.getByText('Nhập ít nhất 10 ký tự (4/10).')).toBeVisible();
    await dlg.getByRole('combobox', { name: /Mẫu hoàn thành/ }).selectOption({ label: `[E2E] [E2E] Mẫu A2-2 ${RUN}` });
    await expect(ta).toHaveValue(TPL);
    await expect(dlg.getByText(/Nhập ít nhất 10 ký tự/)).toBeHidden({ timeout: 30_000 });
    // sai định dạng → lỗi luật V1, không thêm
    await dlg.getByTestId('att-input').setInputFiles({ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') });
    await expect(dlg.getByRole('alert')).toContainText('không đúng định dạng');
    await dlg.getByTestId('att-input').setInputFiles({ name: 'e2e-bien-ban.pdf', mimeType: 'application/pdf', buffer: PDF });
    await expect(dlg.getByText('e2e-bien-ban.pdf')).toBeVisible();
    await expect(dlg.getByText('1/3 tệp')).toBeVisible();
    await dlg.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => taskStatus(ids.main)).toBe('PENDING_REVIEW');
    expect(empStatus(ids.main)).toBe('COMPLETED');
    expect(psql(`SELECT r.content || '|' || r.version || '.' || r."minorVersion" FROM "AssigneeReport" r JOIN "TaskAssignee" a ON a.id=r."assigneeId" WHERE a."taskId"='${ids.main}'`)).toBe(`${TPL}|1.0`);
    expect(psql(`SELECT ra."fileName" FROM "ReportAttachment" ra JOIN "AssigneeReport" r ON r.id=ra."reportId" JOIN "TaskAssignee" a ON a.id=r."assigneeId" WHERE a."taskId"='${ids.main}'`)).toBe('e2e-bien-ban.pdf');
  });

  test('(5) Boss yêu cầu làm lại: lý do từng người → Cần làm lại / Đang làm', async ({ page }) => {
    await login(page, E2E_USERS.boss.username);
    await open(page, ids.main);
    await main(page, 'reject-review').click();
    const dlg = page.getByRole('dialog', { name: 'Yêu cầu làm lại' });
    await expect(dlg).toContainText(TPL); // báo cáo mới nhất của người làm
    await dlg.getByRole('button', { name: 'Yêu cầu làm lại' }).click();
    const ta = dlg.getByRole('textbox', { name: /Lý do cho \[E2E\] Nhân viên/ });
    await expect(ta).toHaveAttribute('aria-invalid', 'true');
    await expect(ta).toBeFocused();
    await ta.fill('[E2E] Bổ sung ảnh chụp sau khi thay');
    await dlg.getByRole('button', { name: 'Yêu cầu làm lại' }).click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => taskStatus(ids.main)).toBe('IN_PROGRESS');
    expect(empStatus(ids.main)).toBe('REVISION_REQUIRED');
  });

  test('(6) Nhân viên báo cáo lại (v2.0) → Chờ nghiệm thu', async ({ page }) => {
    await login(page, E2E_USERS.emp.username);
    await open(page, ids.main);
    await main(page, 'complete').click();
    const dlg = page.getByRole('dialog', { name: 'Báo cáo xong việc' });
    await expect(dlg).toContainText('phiên bản v2.0');
    await dlg.getByRole('textbox', { name: /Nội dung báo cáo/ }).fill('[E2E] Đã bổ sung ảnh chụp.');
    await dlg.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => taskStatus(ids.main)).toBe('PENDING_REVIEW');
  });

  test('(7) Boss nghiệm thu → Đã xong', async ({ page }) => {
    await login(page, E2E_USERS.boss.username);
    await open(page, ids.main);
    await main(page, 'approve-review').click();
    const dlg = page.getByRole('dialog', { name: 'Nghiệm thu công việc này?' });
    await dlg.getByRole('button', { name: 'Nghiệm thu' }).click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => taskStatus(ids.main)).toBe('COMPLETED');
  });

  test('(8) Xin gia hạn (kiểm ngày) → Boss xem xét và duyệt', async ({ page }) => {
    await login(page, E2E_USERS.emp.username);
    await open(page, ids.ext);
    await more(page, 'Xin gia hạn');
    const dlg = page.getByRole('dialog', { name: 'Xin gia hạn' });
    const due = psql(`SELECT to_char("scheduleEnd" AT TIME ZONE 'UTC', 'YYYY-MM-DD') FROM "Task" WHERE id='${ids.ext}'`);
    const date = dlg.getByLabel(/Hạn mới/);
    await date.fill(due);
    await dlg.getByRole('button', { name: 'Gửi đơn' }).click();
    await expect(dlg.getByText(/Chọn ngày từ/)).toBeVisible();
    await expect(dlg.getByText('Nhập lý do.')).toBeVisible();
    const want = new Date(Date.parse(due) + 4 * 86400000).toISOString().slice(0, 10);
    await date.fill(want);
    await dlg.getByRole('textbox', { name: /Lý do/ }).fill('[E2E] Chờ linh kiện');
    await dlg.getByRole('button', { name: 'Gửi đơn' }).click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => psql(`SELECT status FROM "ExtensionRequest" WHERE "taskId"='${ids.ext}'`)).toBe('PENDING');

    await login(page, E2E_USERS.boss.username);
    await open(page, ids.ext);
    await page.getByRole('tab', { name: /Gia hạn/ }).click();
    await page.getByRole('button', { name: 'Xem xét' }).click();
    const rv = page.getByRole('dialog', { name: 'Xem xét đơn gia hạn' });
    await expect(rv).toContainText('[E2E] Chờ linh kiện');
    await expect(rv.locator('[data-slot="dlg-footer"] button')).toHaveText(['Đóng', 'Từ chối', 'Duyệt gia hạn']);
    await rv.getByRole('textbox').fill('[E2E] Đồng ý');
    await rv.getByRole('button', { name: 'Duyệt gia hạn' }).click();
    await expect(rv).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => psql(`SELECT status FROM "ExtensionRequest" WHERE "taskId"='${ids.ext}'`)).toBe('APPROVED');
    expect(psql(`SELECT to_char("scheduleEnd" AT TIME ZONE 'UTC', 'YYYY-MM-DD') FROM "Task" WHERE id='${ids.ext}'`)).toBe(want);
  });

  test('(9) Hủy có lý do (bắt buộc) → Đã hủy', async ({ page }) => {
    await login(page, E2E_USERS.boss.username);
    await open(page, ids.cancel);
    await more(page, 'Hủy công việc');
    const dlg = page.getByRole('dialog', { name: 'Hủy công việc này?' });
    const ok = dlg.getByRole('button', { name: 'Hủy công việc' });
    await expect(ok).toHaveAttribute('data-variant', 'danger');
    await ok.click();
    await expect(dlg.getByText('Nhập lý do.')).toBeVisible();
    expect(taskStatus(ids.cancel)).toBe('WAITING_ACKNOWLEDGE');
    await dlg.getByRole('textbox', { name: /Lý do hủy/ }).fill('[E2E] Đã xử lý ở việc khác');
    await ok.click();
    await expect(dlg).toBeHidden({ timeout: 30_000 });
    await expect.poll(() => taskStatus(ids.cancel)).toBe('CANCELLED');
  });

  test('(10) mobile 390: hộp thoại dạng sheet đáy, không tràn ngang, nút 44px; Esc đóng', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, E2E_USERS.emp.username);
    await open(page, ids.ext);
    await main(page, 'complete').click();
    const dlg = page.getByRole('dialog', { name: 'Báo cáo xong việc' });
    await expect(dlg).toBeVisible();
    await page.waitForTimeout(400); // hết hiệu ứng trượt
    const box = await dlg.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const btns = [...el.querySelectorAll('[data-slot="dlg-footer"] button')].map((b) => Math.round(b.getBoundingClientRect().height));
      const over = [...el.querySelectorAll<HTMLElement>('*')].some((n) => n.getBoundingClientRect().right > window.innerWidth + 0.5);
      return { left: r.left, width: r.width, bottom: r.bottom, btns, over, sw: el.scrollWidth, cw: el.clientWidth };
    });
    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.bottom)).toBe(844);
    expect(box.btns).toEqual([44, 44]);
    expect(box.over).toBe(false);
    expect(box.sw).toBeLessThanOrEqual(box.cw);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden({ timeout: 30_000 });
  });
});

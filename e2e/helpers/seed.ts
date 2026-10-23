import { expect, type Page } from '@playwright/test';
import { api, login } from './auth';
import { E2E_USERS } from './db';

/**
 * Tạo dữ liệu [E2E] qua API V1 (đúng luồng nghiệp vụ, không chèn SQL) cho các kịch bản chi tiết công việc.
 * Mọi việc có tiêu đề bắt đầu bằng `[E2E]` → globalTeardown dọn.
 */

type IdList = { id: string }[] | { data: { id: string }[] };
const firstId = (x: unknown) => (Array.isArray(x) ? x[0] : (x as { data: { id: string }[] }).data[0]).id;

export async function refs(page: Page) {
  const prios = (await api<IdList>(page, '/api/settings/priorities')).json;
  const types = (await api<IdList>(page, '/api/settings/task-types')).json;
  const { json: users } = await api<{ data: { id: string; username: string }[] } | { id: string; username: string }[]>(page, '/api/tasks/assignable-users');
  const list = Array.isArray(users) ? users : users.data;
  const idOf = (u: string) => list.find((x) => x.username === u)!.id;
  return { priorityId: firstId(prios), typeId: firstId(types), empId: idOf(E2E_USERS.emp.username), bossId: idOf(E2E_USERS.boss.username) };
}

export async function createTask(
  page: Page,
  body: { title: string; content?: string; workflowMode: 'IMMEDIATE' | 'NEED_APPROVAL'; assigneeIds: string[]; days?: number },
  r: Awaited<ReturnType<typeof refs>>,
) {
  const res = await api<{ id: string }>(page, '/api/tasks', 'POST', {
    title: body.title,
    content: body.content ?? '<p>Nội dung [E2E]</p>',
    priorityId: r.priorityId,
    typeId: r.typeId,
    scheduleStart: new Date().toISOString().slice(0, 10),
    scheduleEnd: new Date(Date.now() + (body.days ?? 5) * 86400000).toISOString().slice(0, 10),
    workflowMode: body.workflowMode,
    assigneeIds: body.assigneeIds,
    isForceMode: false,
  });
  expect(res.status, JSON.stringify(res.json)).toBe(201);
  return res.json.id;
}

export async function call(page: Page, url: string, method = 'POST', body?: unknown) {
  const res = await api(page, url, method, body);
  expect(res.status, `${url} → ${JSON.stringify(res.json)}`).toBeLessThan(300);
  return res.json;
}

/**
 * 4 việc mẫu ở 4 trạng thái (Boss tạo, giao Nhân viên):
 *  - approval: Phê duyệt, Chờ duyệt (do NHÂN VIÊN tạo → Boss duyệt)
 *  - waiting:  Trực tiếp, Chờ nhận việc
 *  - progress: Phê duyệt → đã duyệt → nhân viên nhận → Đang làm (+ đơn gia hạn + bình luận)
 *  - review:   Phê duyệt → … → nhân viên báo cáo → Chờ nghiệm thu
 */
export async function seedDetailTasks(page: Page, run: string) {
  await login(page, E2E_USERS.boss.username);
  const r = await refs(page);
  const long = Array.from({ length: 24 }, (_, i) => `<p>Bước ${i + 1}: kiểm tra và ghi nhận kết quả.</p>`).join('');
  const waiting = await createTask(page, { title: `[E2E] Chờ nhận ${run}`, workflowMode: 'IMMEDIATE', assigneeIds: [r.empId] }, r);
  const progress = await createTask(page, { title: `[E2E] Đang làm ${run}`, content: long, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId], days: 2 }, r);
  const review = await createTask(page, { title: `[E2E] Chờ nghiệm thu ${run}`, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
  // Boss tạo việc Phê duyệt → bỏ qua Chờ duyệt (vào thẳng Chờ nhận việc)
  await call(page, `/api/tasks/${progress}/comments`, 'POST', { content: '[E2E] Boss: nhớ cập nhật tiến độ nhé.' });

  await login(page, E2E_USERS.emp.username);
  const approval = await createTask(page, { title: `[E2E] Chờ duyệt ${run}`, workflowMode: 'NEED_APPROVAL', assigneeIds: [r.empId] }, r);
  for (const id of [progress, review]) await call(page, `/api/tasks/${id}/acknowledge`);
  await call(page, `/api/tasks/${progress}/extension`, 'POST', {
    reason: '[E2E] Cần thêm thời gian chờ linh kiện',
    requestedDate: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
  });
  await call(page, `/api/tasks/${progress}/comments`, 'POST', { content: '[E2E] Nhân viên: đang xử lý, chiều xong.' });
  await call(page, `/api/tasks/${review}/complete`, 'POST', { reportContent: '[E2E] Đã xử lý xong toàn bộ.\nĐã kiểm tra lại.', files: [] });

  return { approval, waiting, progress, review };
}

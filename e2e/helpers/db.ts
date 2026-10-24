import { execFileSync } from 'child_process';

/**
 * Chạy SQL trên DB của Docker local qua `docker exec` (DB không publish port ra host).
 * SQL truyền qua stdin để tránh lỗi quoting giữa các shell.
 */
const CONTAINER = process.env.E2E_DB_CONTAINER ?? 'techops-db';

export function psql(sql: string): string {
  // execFileSync: không qua shell của host (cmd.exe trên Windows không hiểu nháy đơn)
  return execFileSync(
    'docker',
    ['exec', '-i', CONTAINER, 'sh', '-c', 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'],
    { input: sql, encoding: 'utf8' },
  ).trim();
}

export const E2E_PASSWORD = 'E2e!Passw0rd#2026';
export const E2E_USERS = {
  boss: { username: 'e2e_boss', displayName: '[E2E] Boss', role: 'BOSS' },
  emp:  { username: 'e2e_emp',  displayName: '[E2E] Nhân viên', role: 'EMPLOYEE' },
  admin: { username: 'e2e_admin', displayName: '[E2E] Admin', role: 'ADMIN' },
} as const;

/** User [E2E] do từng spec tự tạo (vd e2e_pw của notifications-profile-v2) — globalSetup không tạo, teardown vẫn dọn. */
export const E2E_EXTRA_USERNAMES = ['e2e_pw', 'e2e_hrnew'];

const usernames = [...Object.values(E2E_USERS).map((u) => u.username), ...E2E_EXTRA_USERNAMES].map((u) => `'${u}'`).join(',');

/** Xoá toàn bộ dữ liệu [E2E]: task do user E2E tạo (cascade assignee/report/comment/audit/view), user
 *  (cascade thông báo + quyền menu SidebarPermission), mức ưu tiên [E2E]. */
export function cleanupE2E() {
  psql(`
    DELETE FROM "Task" WHERE "creatorId" IN (SELECT id FROM "User" WHERE username IN (${usernames}))
       OR title LIKE '[E2E]%';
    DELETE FROM "TaskAuditLog" WHERE "performedById" IN (SELECT id FROM "User" WHERE username IN (${usernames}));
    DELETE FROM "UserActivityLog" WHERE "userId" IN (SELECT id FROM "User" WHERE username IN (${usernames}));
    DELETE FROM "Notification" WHERE title LIKE '[E2E]%';
    -- ticket Helpdesk chèn trong E2E (helpdesk-v2.spec.ts)
    DELETE FROM "HelpdeskPendingTask" WHERE "hdId" LIKE 'E2E-%' OR "tieuDe" LIKE '[E2E]%';
    DELETE FROM "User" WHERE username IN (${usernames});
    -- mức ưu tiên tạo trong E2E (chưa gắn task nào)
    DELETE FROM "Priority" WHERE name LIKE '[E2E]%'
      AND NOT EXISTS (SELECT 1 FROM "Task" t WHERE t."priorityId" = "Priority".id);
  `);
}

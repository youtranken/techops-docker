import bcrypt from 'bcryptjs';
import { psql, cleanupE2E, E2E_USERS, E2E_PASSWORD } from './helpers/db';

/** id dạng cuid (schema validate assigneeIds bằng z.string().cuid()) */
function cuidFor(username: string) {
  return ('ce2e' + username.replace(/[^a-z0-9]/gi, '') + '0'.repeat(25)).slice(0, 25).toLowerCase();
}

export default async function globalSetup() {
  cleanupE2E(); // dọn tàn dư lần chạy trước (nếu có)
  const hash = await bcrypt.hash(E2E_PASSWORD, 10);
  for (const u of Object.values(E2E_USERS)) {
    psql(`
      INSERT INTO "User" (id, username, password, "displayName", "roleId", "isActive", "mustChangePassword",
                          "passwordChangedAt", "emailVerifiedAt", "createdAt", "updatedAt")
      SELECT '${cuidFor(u.username)}', '${u.username}', '${hash}', '${u.displayName}', r.id, true, false,
             -- DB TimeZone +7 nhưng Prisma ghi UTC → dùng giờ UTC cho khớp
             now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
      FROM "Role" r WHERE r.name = '${u.role}';
    `);
  }
}

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import type { UserWithRole, CreateUserInput, UpdateUserInput } from '../types';
import { userQueryService } from './user-query.service';
import { notificationService } from '@/modules/notifications/services/notification.service';

const EMAIL_VERIFY_TTL = 24 * 60 * 60; // 24h

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

async function sendEmailVerification(userId: string, email: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  await getRedis().set(`email_verify:${token}`, `${userId}:${email}`, 'EX', EMAIL_VERIFY_TTL);

  const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  const safeEmail = escapeHtml(email);

  const result = await sendEmail({
    to: email,
    subject: '[TechOps] Xác nhận địa chỉ email',
    html: `
<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#059669,#10b981);border-radius:14px 14px 0 0;padding:28px 32px;text-align:center">
    <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff">📧 Xác nhận Email</h1>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">
      Địa chỉ email <strong>${safeEmail}</strong> đã được thêm vào tài khoản TechOps của bạn.<br>
      Nhấn vào nút bên dưới để xác nhận:
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${verifyUrl}" style="display:inline-block;background:#059669;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none">
        Xác nhận email →
      </a>
    </div>
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
      Link có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;border-radius:0 0 14px 14px;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">Email tự động từ <strong>TechOps</strong>.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  });
  if (!result.success) {
    throw new Error(result.error ?? 'Failed to send verification email');
  }
}

/** Xóa cache isActive để JWT callback nhận trạng thái mới ngay trong 30s */
async function invalidateActiveCache(userId: string): Promise<void> {
  try {
    await getRedis().del(`user:active:${userId}`);
  } catch {
    // Non-critical — cache sẽ tự hết hạn sau 30s
  }
}

class UserMutationService {
  async create(data: CreateUserInput, performedById: string): Promise<UserWithRole> {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });

    if (existing) {
      const err = new Error('Username or email already exists') as Error & { code: string };
      err.code = 'USER_DUPLICATE';
      throw err;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    let user: UserWithRole;
    try {
      user = await prisma.user.create({
        data: {
          username: data.username,
          displayName: data.displayName,
          email: data.email || null,
          password: hashedPassword,
          passwordChangedAt: new Date(),
          roleId: data.roleId,
          isActive: true,
          ...(data.mustChangePassword !== undefined ? { mustChangePassword: data.mustChangePassword } : {}),
        },
        include: { role: true },
      });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        const dupErr = new Error('Username or email already exists') as Error & { code: string };
        dupErr.code = 'USER_DUPLICATE';
        throw dupErr;
      }
      throw err;
    }

    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'CREATE_USER',
        metadata: { targetUserId: user.id, username: user.username } },
    });

    return user;
  }

  async update(id: string, data: UpdateUserInput, performedById: string): Promise<UserWithRole> {
    await userQueryService.getById(id);

    type PatchData = {
      displayName?: string;
      email?: string | null;
      roleId?: string;
      isActive?: boolean;
      password?: string;
    };
    const patch: PatchData = {};
    if (data.displayName !== undefined) patch.displayName = data.displayName;
    const emailChanged = data.email !== undefined;
    if (emailChanged) {
      patch.email = data.email || null;
      // Email changed → reset verified status
      (patch as Record<string, unknown>).emailVerifiedAt = null;
    }
    if (data.roleId !== undefined) patch.roleId = data.roleId;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.password) {
      patch.password = await bcrypt.hash(data.password, 10);
      (patch as Record<string, unknown>).passwordChangedAt = new Date();
    }

    let user: UserWithRole;
    try {
      user = await prisma.user.update({ where: { id }, data: patch, include: { role: true } });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        const dupErr = new Error('Email đã được sử dụng bởi tài khoản khác') as Error & { code: string };
        dupErr.code = 'USER_DUPLICATE';
        throw dupErr;
      }
      throw err;
    }

    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'UPDATE_USER',
        metadata: { targetUserId: id, changes: Object.keys(data) } },
    });

    // Nếu isActive thay đổi → xóa cache ngay để requireAuth nhận trạng thái mới ≤30s
    if (data.isActive !== undefined) {
      await invalidateActiveCache(id);
    }

    // Gửi email xác nhận nếu email thay đổi (fire-and-forget — không chặn response)
    if (emailChanged && user.email) {
      sendEmailVerification(user.id, user.email).catch((e) =>
        console.error('[email-verify] send failed:', e),
      );
    }

    return user;
  }

  async deactivate(id: string, performedById: string): Promise<UserWithRole> {
    await userQueryService.getById(id);

    // S10: cancel active assignments before deactivating
    const activeAssignments = await prisma.taskAssignee.findMany({
      where: { userId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      select: { id: true, taskId: true, task: { select: { id: true, creatorId: true, status: true } } },
    });

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { isActive: false }, include: { role: true } });

      if (activeAssignments.length > 0) {
        await tx.taskAssignee.updateMany({
          where: { userId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
          data: { status: 'REJECTED', rejectedAt: new Date(), transferNotes: 'Nhân viên đã bị vô hiệu hóa' },
        });

        // Mark tasks as allFailed if this was the last active assignee
        const affectedTaskIds = [...new Set(activeAssignments.map((a) => a.task.id))];
        for (const taskId of affectedTaskIds) {
          if (['COMPLETED', 'CANCELLED'].includes(activeAssignments.find((a) => a.task.id === taskId)!.task.status)) continue;
          const remaining = await tx.taskAssignee.findMany({ where: { taskId } });
          const allDone = remaining.length > 0 && remaining.every((a) => ['REJECTED', 'TRANSFERRED'].includes(a.status));
          if (allDone) {
            await tx.task.update({ where: { id: taskId }, data: { allFailed: true } });
          }
        }
      }

      await tx.userActivityLog.create({
        data: { userId: performedById, action: 'UPDATE_USER', metadata: { targetUserId: id, action: 'deactivate' } },
      });
      return updated;
    });

    // Notify creators of affected tasks (outside transaction)
    try {
      for (const assignment of activeAssignments) {
        const task = assignment.task;
        if (!['COMPLETED', 'CANCELLED'].includes(task.status) && task.creatorId !== id) {
          await notificationService.create({
            userId: task.creatorId,
            taskId: task.id,
            type: 'ALL_FAILED' as never,
            title: 'Nhân viên bị vô hiệu hóa',
            message: 'Một người thực hiện đã bị vô hiệu hóa. Vui lòng giao lại công việc.',
            sendEmail: false,
          });
        }
      }
    } catch (e) {
      console.error('[deactivate] notification failed:', e);
    }

    await invalidateActiveCache(id);
    return user;
  }

  async deleteHard(id: string, performedById: string): Promise<UserWithRole> {
    await userQueryService.getById(id);

    const taskCount = await prisma.task.count({
      where: { OR: [{ creatorId: id }, { assignees: { some: { userId: id } } }] },
    });

    if (taskCount > 0) {
      const err = new Error(
        'Không thể xóa: người dùng đã có task liên quan. Hãy dùng Vô hiệu hóa.',
      ) as Error & { code: string };
      err.code = 'USER_HAS_TASKS';
      throw err;
    }

    const deleted = await prisma.user.delete({ where: { id }, include: { role: true } });

    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'DELETE_USER',
        metadata: { targetUserId: id, username: deleted.username } },
    });

    return deleted;
  }

  async resetPassword(id: string, newPassword: string, performedById: string): Promise<void> {
    await userQueryService.getById(id);
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashed, mustChangePassword: false, passwordChangedAt: new Date() },
    });
    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'RESET_PASSWORD', metadata: { targetUserId: id } },
    });
  }

  async bulkDeactivate(ids: string[], performedById: string): Promise<void> {
    // S10: cancel active assignments for all deactivated users
    const activeAssignments = await prisma.taskAssignee.findMany({
      where: { userId: { in: ids }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      select: { taskId: true, task: { select: { id: true, creatorId: true, status: true } } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });

      if (activeAssignments.length > 0) {
        await tx.taskAssignee.updateMany({
          where: { userId: { in: ids }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
          data: { status: 'REJECTED', rejectedAt: new Date(), transferNotes: 'Nhân viên đã bị vô hiệu hóa' },
        });
        const affectedTaskIds = [...new Set(activeAssignments.map((a) => a.task.id))];
        for (const taskId of affectedTaskIds) {
          const taskStatus = activeAssignments.find((a) => a.task.id === taskId)!.task.status;
          if (['COMPLETED', 'CANCELLED'].includes(taskStatus)) continue;
          const remaining = await tx.taskAssignee.findMany({ where: { taskId } });
          if (remaining.length > 0 && remaining.every((a) => ['REJECTED', 'TRANSFERRED'].includes(a.status))) {
            await tx.task.update({ where: { id: taskId }, data: { allFailed: true } });
          }
        }
      }

      await tx.userActivityLog.createMany({
        data: ids.map((targetUserId) => ({
          userId: performedById, action: 'DEACTIVATE_USER' as const, metadata: { targetUserId },
        })),
      });
    });
    await Promise.all(ids.map((id) => invalidateActiveCache(id)));
  }

  async bulkActivate(ids: string[], performedById: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { isActive: true } });
      await tx.userActivityLog.createMany({
        data: ids.map((targetUserId) => ({
          userId: performedById, action: 'ACTIVATE_USER' as const, metadata: { targetUserId },
        })),
      });
    });
  }

  async bulkChangeRole(ids: string[], roleId: string, performedById: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { roleId } });
      await tx.userActivityLog.createMany({
        data: ids.map((targetUserId) => ({
          userId: performedById, action: 'UPDATE_USER' as const, metadata: { targetUserId, roleId },
        })),
      });
    });
    // Invalidate active cache for all affected users (role change may affect permissions)
    await Promise.all(ids.map((id) => invalidateActiveCache(id)));
  }

  async bulkSetMustChangePassword(ids: string[], performedById: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { mustChangePassword: true } });
      await tx.userActivityLog.createMany({
        data: ids.map((targetUserId) => ({
          userId: performedById, action: 'RESET_PASSWORD' as const, metadata: { targetUserId, type: 'bulk_force_change' },
        })),
      });
    });
  }
}

export const userMutationService = new UserMutationService();

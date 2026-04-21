import { prisma } from '@/lib/prisma';
import { createNotification } from './workflow/_shared';
import type { PaginatedResult } from '@/lib/types/pagination';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/types/pagination';

interface SessionUser {
  id: string;
  role: { name: string };
}

export interface CommentItem {
  id: string;
  content: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; displayName: string; username: string; profile: { avatarColor: string; avatarUrl: string | null } | null };
}

class CommentError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CommentError';
  }
}

export const commentService = {
  async list(
    taskId: string,
    { page = 1, limit = DEFAULT_PAGE_SIZE }: { page?: number; limit?: number },
    currentUser: SessionUser,
  ): Promise<PaginatedResult<CommentItem>> {
    const isPrivileged = ['ADMIN', 'BOSS'].includes(currentUser.role.name);
    if (!isPrivileged) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, OR: [{ creatorId: currentUser.id }, { assignees: { some: { userId: currentUser.id } } }] },
        select: { id: true },
      });
      if (!task) throw new CommentError('COMMENT_FORBIDDEN', 'Không có quyền xem bình luận này');
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(MAX_PAGE_SIZE, limit);
    const skip = (safePage - 1) * safeLimit;

    const where = { taskId };

    const [data, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        select: {
          id: true,
          content: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, displayName: true, username: true, profile: { select: { avatarColor: true, avatarUrl: true } } } },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: safeLimit,
      }),
      prisma.comment.count({ where }),
    ]);

    // Mask nội dung comment đã bị xóa — không gửi về client
    const masked = data.map((c) =>
      c.isDeleted ? { ...c, content: '' } : c
    );

    return {
      data: masked as CommentItem[],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  },

  async create(
    taskId: string,
    data: { content: string; mentions?: string[] },
    currentUser: SessionUser,
  ): Promise<CommentItem> {
    const trimmed = data.content?.trim() ?? '';
    if (trimmed.length < 1) {
      throw new CommentError('COMMENT_CREATE_FAILED', 'Nội dung bình luận không được trống');
    }
    if (trimmed.length > 5000) {
      throw new CommentError('COMMENT_CREATE_FAILED', 'Nội dung bình luận tối đa 5000 ký tự');
    }

    const isPrivileged = ['ADMIN', 'BOSS'].includes(currentUser.role.name);
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        ...(isPrivileged ? {} : {
          OR: [
            { creatorId: currentUser.id },
            { assignees: { some: { userId: currentUser.id } } },
          ],
        }),
      },
    });
    if (!task) throw new CommentError('COMMENT_CREATE_FAILED', 'Công việc không tồn tại hoặc bạn không có quyền bình luận');

    // M2: dedup and cap mentions array
    const uniqueMentions = [...new Set(data.mentions ?? [])].slice(0, 20);

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          taskId,
          authorId: currentUser.id,
          content: trimmed,
          mentions: uniqueMentions,
        },
        select: {
          id: true,
          content: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, displayName: true, username: true, profile: { select: { avatarColor: true, avatarUrl: true } } } },
        },
      });
      await tx.taskAuditLog.create({
        data: {
          taskId,
          performedById: currentUser.id,
          action: 'COMMENT_ADDED',
          details: { commentId: newComment.id } as never,
        },
      });
      return newComment;
    });

    // Notify mentioned users
    if (uniqueMentions.length > 0) {
      for (const userId of uniqueMentions) {
        if (userId !== currentUser.id) {
          await createNotification(
            userId,
            taskId,
            'COMMENT_ADDED',
            'Bình luận mới trong công việc',
            `${comment.author.displayName} đã nhắc đến bạn`,
          );
        }
      }
    }

    return comment as CommentItem;
  },

  async update(
    commentId: string,
    data: { content: string },
    currentUser: SessionUser,
  ): Promise<CommentItem> {
    const trimmed = data.content?.trim() ?? '';
    if (trimmed.length < 1) {
      throw new CommentError('COMMENT_UPDATE_FAILED', 'Nội dung bình luận không được trống');
    }
    if (trimmed.length > 5000) {
      throw new CommentError('COMMENT_UPDATE_FAILED', 'Nội dung bình luận tối đa 5000 ký tự');
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) {
      throw new CommentError('COMMENT_NOT_FOUND', 'Bình luận không tồn tại');
    }
    if (comment.authorId !== currentUser.id) {
      throw new CommentError('COMMENT_PERMISSION_DENIED', 'Chỉ tác giả mới có thể chỉnh sửa bình luận');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.comment.update({
        where: { id: commentId },
        data: { content: trimmed },
        select: {
          id: true,
          content: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, displayName: true, username: true, profile: { select: { avatarColor: true, avatarUrl: true } } } },
        },
      });
      await tx.taskAuditLog.create({
        data: {
          taskId: comment.taskId,
          performedById: currentUser.id,
          action: 'COMMENT_ADDED', // dùng COMMENT_ADDED làm proxy (không có COMMENT_UPDATED trong enum)
          details: { commentId, event: 'updated' } as never,
        },
      });
      return result;
    });

    return updated as CommentItem;
  },

  async softDelete(commentId: string, currentUser: SessionUser): Promise<void> {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) {
      throw new CommentError('COMMENT_NOT_FOUND', 'Bình luận không tồn tại');
    }

    const isAdmin = ['ADMIN'].includes(currentUser.role.name);
    if (comment.authorId !== currentUser.id && !isAdmin) {
      throw new CommentError('COMMENT_PERMISSION_DENIED', 'Chỉ tác giả hoặc Admin mới có thể xóa bình luận');
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });
      await tx.taskAuditLog.create({
        data: {
          taskId: comment.taskId,
          performedById: currentUser.id,
          action: 'COMMENT_ADDED', // dùng COMMENT_ADDED làm proxy (không có COMMENT_DELETED trong enum)
          details: { commentId, event: 'deleted' } as never,
        },
      });
    });
  },
};

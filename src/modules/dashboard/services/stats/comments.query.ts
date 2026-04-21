import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { RecentComment } from './types';

export async function queryRecentComments(baseFilter: Prisma.TaskWhereInput): Promise<RecentComment[]> {
  // Fetch more than needed, then group by task keeping only the latest comment per task
  const rows = await prisma.comment.findMany({
    where: {
      isDeleted: false,
      task: { ...baseFilter },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          displayName: true,
          profile: { select: { avatarColor: true, avatarUrl: true } },
        },
      },
      task: { select: { id: true, taskCode: true, title: true } },
    },
  });

  // Keep only the latest comment per task (rows are already sorted desc)
  const seen = new Set<string>();
  const deduplicated: typeof rows = [];
  for (const r of rows) {
    if (!seen.has(r.task.id)) {
      seen.add(r.task.id);
      deduplicated.push(r);
    }
    if (deduplicated.length === 6) break;
  }

  return deduplicated.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.createdAt,
    author: {
      displayName: r.author.displayName,
      avatarColor: r.author.profile?.avatarColor ?? '#6b7280',
      avatarUrl: r.author.profile?.avatarUrl ?? null,
    },
    task: r.task,
  }));
}

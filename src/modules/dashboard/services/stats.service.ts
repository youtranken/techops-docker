import { cache } from '@/lib/cache';
import {
  type SessionUser,
  type DashboardStats,
  buildSecurityFilter,
  queryCardStats,
  queryRecentTasks,
  queryActionItems,
  queryUpcomingDeadlines,
  queryRecentComments,
} from './stats';

// Re-export types for backward compatibility
export type { SessionUser, DashboardStats, RecentComment } from './stats';

// ─── Service ──────────────────────────────────────────────────────────────────

class StatsService {
  async getOverview(user: SessionUser): Promise<DashboardStats> {
    const cacheKey = `dashboard:${user.id}:${user.role.name}`;
    const cached = await cache.get<DashboardStats>(cacheKey);
    if (cached) return cached;

    const baseFilter = buildSecurityFilter(user);

    const [cardStats, recentTasks, actionItems, upcomingDeadlines, recentComments] = await Promise.all([
      queryCardStats(baseFilter, user),
      queryRecentTasks(baseFilter),
      queryActionItems(user),
      queryUpcomingDeadlines(baseFilter),
      queryRecentComments(baseFilter),
    ]);

    const stats: DashboardStats = {
      ...cardStats,
      recentTasks,
      actionItems,
      upcomingDeadlines,
      recentComments,
    };

    await cache.set(cacheKey, stats, 300);
    return stats;
  }
}

export const statsService = new StatsService();

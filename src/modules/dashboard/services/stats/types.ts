import type { Prisma } from '@prisma/client';

// ─── Session User ────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  role: { name: string };
}

// ─── Assignee Snippet ────────────────────────────────────────────────────────

export interface AssigneeSnippet {
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
}

// ─── Widget Types ────────────────────────────────────────────────────────────

export interface RecentTask {
  id: string;
  taskCode: string | null;
  title: string;
  status: string;
  scheduleEnd: Date;
  updatedAt: Date;
  priority: { name: string; color: string } | null;
  assignees: AssigneeSnippet[];
  creator: { displayName: string; avatarColor: string; avatarUrl: string | null } | null;
}

export interface ActionItem {
  id: string;
  taskCode: string | null;
  title: string;
  status: string;
  scheduleEnd: Date;
  priority: { name: string; color: string } | null;
}

export interface UpcomingDeadline {
  id: string;
  taskCode: string | null;
  title: string;
  status: string;
  scheduleEnd: Date;
  priority: { name: string; color: string } | null;
  assignees: AssigneeSnippet[];
}

export interface RecentComment {
  id: string;
  content: string;
  createdAt: Date;
  author: { displayName: string; avatarColor: string; avatarUrl: string | null };
  task: { id: string; taskCode: string | null; title: string };
}

// ─── Card Stats ──────────────────────────────────────────────────────────────

export interface CardStatsResult {
  totalTasks: number;
  completedTasks: number;
  completionRate: string;
  overdueCount: number;
  slaRate: string;
  // BOSS/ADMIN only (0 for EMPLOYEE)
  pendingApproval: number;
  pendingReview: number;
  pendingExtensions: number;
  // EMPLOYEE only (0 for BOSS)
  myInProgress: number;
  myWaitingAck: number;
  // Charts — filtered to current month
  tasksByStatus: Record<string, number>;
  tasksByWorkflowMode: { IMMEDIATE: number; NEED_APPROVAL: number };
  tasksByPriority: { priorityId: string; name: string; color: string; count: number }[];
}

// ─── Dashboard Stats (Final aggregated) ──────────────────────────────────────

export interface DashboardStats extends CardStatsResult {
  recentTasks: RecentTask[];
  actionItems: ActionItem[];
  upcomingDeadlines: UpcomingDeadline[];
  recentComments: RecentComment[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const assigneeSelect = {
  select: {
    user: {
      select: {
        displayName: true,
        profile: { select: { avatarColor: true, avatarUrl: true } },
      },
    },
  },
} satisfies Prisma.TaskAssigneeArgs;

export function mapAssignees(
  raw: { user: { displayName: string; profile: { avatarColor: string; avatarUrl: string | null } | null } }[]
): AssigneeSnippet[] {
  return raw.map((a) => ({
    displayName: a.user.displayName,
    avatarColor: a.user.profile?.avatarColor ?? '#6b7280',
    avatarUrl: a.user.profile?.avatarUrl ?? null,
  }));
}

export function buildSecurityFilter(user: SessionUser): Prisma.TaskWhereInput {
  if (user.role.name === 'EMPLOYEE') {
    return {
      OR: [
        { creatorId: user.id },
        { assignees: { some: { userId: user.id } } },
      ],
    };
  }
  return {};
}

/** First day of current month at 00:00:00 local */
export function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

import { prisma } from '@/lib/prisma';
import type { UserAction, Prisma } from '@prisma/client';
import { normalizeIp } from '@/lib/ip-utils';
import type { PaginatedResult } from '@/lib/types/pagination';
import type { UserLogEntry, UserLogFilters, ParsedDevice } from '../types';

// ─── Device Parser ────────────────────────────────────────────────────────────

function parseUserAgent(ua: string | null): ParsedDevice | null {
  if (!ua) return null;

  let browser = 'Unknown';
  let browserVersion = '';
  if (/Edg\/(\S+)/.test(ua)) {
    browser = 'Edge'; browserVersion = RegExp.$1.split('.')[0];
  } else if (/Chrome\/(\S+)/.test(ua) && !/Chromium/.test(ua)) {
    browser = 'Chrome'; browserVersion = RegExp.$1.split('.')[0];
  } else if (/Firefox\/(\S+)/.test(ua)) {
    browser = 'Firefox'; browserVersion = RegExp.$1.split('.')[0];
  } else if (/Safari\/(\S+)/.test(ua) && !/Chrome/.test(ua)) {
    browser = 'Safari'; browserVersion = RegExp.$1.split('.')[0];
  } else if (/OPR\/(\S+)|Opera\/(\S+)/.test(ua)) {
    browser = 'Opera'; browserVersion = (RegExp.$1 || RegExp.$2).split('.')[0];
  }

  let os = 'Unknown';
  if (/Windows NT 10/.test(ua)) os = 'Windows 11/10';
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android (\d+)/.test(ua)) os = `Android ${RegExp.$1}`;
  else if (/iPhone OS (\d+)/.test(ua)) os = `iOS ${RegExp.$1}`;
  else if (/Linux/.test(ua)) os = 'Linux';

  let deviceType: ParsedDevice['deviceType'] = 'Desktop';
  if (/Mobi|Android.*Mobile|iPhone/.test(ua)) deviceType = 'Mobile';
  else if (/iPad|Android(?!.*Mobile)/.test(ua)) deviceType = 'Tablet';

  return { browser, browserVersion, os, deviceType };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogUserInput {
  userId: string;
  action: UserAction;
  ipAddress?: string;
  ipType?: string;
  ispName?: string;
  city?: string;
  country?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class UserActivityLogService {
  async log(data: LogUserInput): Promise<void> {
    await prisma.userActivityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        ipAddress: data.ipAddress,
        ipType: data.ipType,
        ispName: data.ispName,
        city: data.city,
        country: data.country,
        userAgent: data.userAgent,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async getAll(filters: UserLogFilters): Promise<PaginatedResult<UserLogEntry>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.UserActivityLogWhereInput = {
      // 'UNKNOWN' = brute-force log với username không có trong DB (userId = null)
      ...(filters.userId === 'UNKNOWN'
        ? { userId: null }
        : filters.userId
          ? { userId: filters.userId }
          : {}),
      ...(filters.action && { action: filters.action as UserAction }),
      ...(filters.ipType && { ipType: filters.ipType }),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
              ...(filters.dateTo && { lte: new Date(filters.dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.userActivityLog.findMany({
        where,
        include: {
          user: { select: { id: true, displayName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userActivityLog.count({ where }),
    ]);

    const data: UserLogEntry[] = rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      action: row.action,
      metadata: row.metadata as Record<string, unknown> | null,
      ipAddress: row.ipAddress ? normalizeIp(row.ipAddress) : null,
      ipType: (row.ipType as 'internal' | 'external') ?? null,
      ispName: row.ispName,
      city: row.city,
      country: row.country,
      userAgent: row.userAgent,
      parsedDevice: parseUserAgent(row.userAgent),
      user: row.user,
    }));

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const userActivityLogService = new UserActivityLogService();

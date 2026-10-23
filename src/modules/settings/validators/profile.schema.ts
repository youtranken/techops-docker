import { z } from 'zod';

/** Body PATCH /api/settings/profile (V1) — dùng chung cho route và kiểm tra phía client (A3-2). Không đổi luật. */
export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  avatarUrl: z.string().nullable().optional(),
  phone: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
});

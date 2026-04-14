import { getRedis } from './redis';

/**
 * Redis-backed cache with TTL support.
 * Production-ready: uses Redis for distributed caching across workers/containers.
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      console.error('[Cache] get error:', err);
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      const redis = getRedis();
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error('[Cache] set error:', err);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(key);
    } catch (err) {
      console.error('[Cache] delete error:', err);
    }
  },

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const redis = getRedis();
      // Use SCAN instead of KEYS to avoid blocking Redis
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      console.error('[Cache] deleteByPrefix error:', err);
    }
  },

  async clear(): Promise<void> {
    try {
      const redis = getRedis();
      await redis.flushdb();
    } catch (err) {
      console.error('[Cache] clear error:', err);
    }
  },
};

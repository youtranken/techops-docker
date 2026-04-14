import { NextResponse } from 'next/server';
import { getRedis } from './redis';
import { securityConfigService } from '@/modules/settings/services/security-config.service';

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

// Cache security config for 60 seconds to avoid DB calls on every request
let cachedConfig: { config: Awaited<ReturnType<typeof securityConfigService.get>>; expiry: number } | null = null;

async function getSecurityConfig() {
  const now = Date.now();
  if (cachedConfig && now < cachedConfig.expiry) {
    return cachedConfig.config;
  }
  
  try {
    const config = await securityConfigService.get();
    cachedConfig = { config, expiry: now + 60_000 }; // Cache for 60 seconds
    return config;
  } catch (err) {
    console.error('[RateLimit] Failed to get security config:', err);
    // Return defaults if DB fails
    return {
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        windowSeconds: 60,
        loginMaxAttempts: 5,
        lockoutMinutes: 15,
      },
    };
  }
}

/**
 * Rate limiter using Redis sliding window algorithm.
 * Reads configuration from SecurityConfig in database.
 * Returns null if request is allowed, or NextResponse with 429 if rate limited.
 */
export async function rateLimit(
  identifier: string,
  configOverride?: Partial<RateLimitConfig>
): Promise<NextResponse | null> {
  const securityConfig = await getSecurityConfig();
  
  // If rate limiting is disabled in settings, allow all requests
  if (!securityConfig.rateLimit.enabled) {
    return null;
  }

  const maxRequests = configOverride?.maxRequests ?? securityConfig.rateLimit.maxRequests;
  const windowSeconds = configOverride?.windowSeconds ?? securityConfig.rateLimit.windowSeconds;
  const key = `ratelimit:${identifier}`;

  try {
    const redis = getRedis();
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Use Redis transaction for atomic operations
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry on the key
    pipeline.expire(key, windowSeconds);
    
    const results = await pipeline.exec();
    
    // Get the count from zcard result (index 1)
    const count = (results?.[1]?.[1] as number) || 0;

    if (count >= maxRequests) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            retryAfter: windowSeconds,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(windowSeconds),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((now + windowSeconds * 1000) / 1000)),
          },
        }
      );
    }

    return null; // Request allowed
  } catch (err) {
    // If Redis fails, allow the request (fail open)
    console.error('[RateLimit] Redis error, allowing request:', err);
    return null;
  }
}

/**
 * Get identifier for rate limiting from request.
 * Uses IP address, falling back to a default for local development.
 */
export function getRateLimitIdentifier(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const realIp = req.headers.get('x-real-ip');
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = realIp || forwarded?.split(',')[0]?.trim() || 'anonymous';
  return ip;
}

/**
 * Rate limit specifically for login attempts (stricter limits).
 * Reads loginMaxAttempts from SecurityConfig.
 */
export async function rateLimitLogin(identifier: string): Promise<NextResponse | null> {
  const securityConfig = await getSecurityConfig();
  
  return rateLimit(`login:${identifier}`, {
    maxRequests: securityConfig.rateLimit.loginMaxAttempts,
    windowSeconds: 60, // 1 minute window
  });
}

/**
 * Rate limit for API endpoints (general limit).
 * Reads maxRequests and windowSeconds from SecurityConfig.
 */
export async function rateLimitApi(identifier: string): Promise<NextResponse | null> {
  // Uses default config from SecurityConfig
  return rateLimit(`api:${identifier}`);
}

/**
 * Check if a user/IP is currently locked out due to too many failed login attempts.
 * Returns lockout info if locked, null if not locked.
 */
export async function checkLoginLockout(identifier: string): Promise<{ locked: boolean; remainingSeconds: number } | null> {
  const securityConfig = await getSecurityConfig();
  const key = `lockout:${identifier}`;

  try {
    const redis = getRedis();
    const ttl = await redis.ttl(key);
    
    if (ttl > 0) {
      return { locked: true, remainingSeconds: ttl };
    }
    
    return null;
  } catch (err) {
    console.error('[RateLimit] Redis error checking lockout:', err);
    return null;
  }
}

/**
 * Record a failed login attempt. If attempts exceed limit, create lockout.
 */
export async function recordFailedLogin(identifier: string): Promise<{ locked: boolean; attemptsRemaining: number }> {
  const securityConfig = await getSecurityConfig();
  const { loginMaxAttempts, lockoutMinutes } = securityConfig.rateLimit;
  const key = `failed_login:${identifier}`;
  const lockoutKey = `lockout:${identifier}`;

  try {
    const redis = getRedis();
    
    // Increment failed attempts
    const attempts = await redis.incr(key);
    
    // Set expiry on first attempt (reset window)
    if (attempts === 1) {
      await redis.expire(key, 60 * 5); // 5 minute window for counting attempts
    }
    
    // Check if we should lock out
    if (attempts >= loginMaxAttempts) {
      // Create lockout
      await redis.setex(lockoutKey, lockoutMinutes * 60, '1');
      // Clear failed attempts counter
      await redis.del(key);
      
      return { locked: true, attemptsRemaining: 0 };
    }
    
    return { locked: false, attemptsRemaining: loginMaxAttempts - attempts };
  } catch (err) {
    console.error('[RateLimit] Redis error recording failed login:', err);
    return { locked: false, attemptsRemaining: loginMaxAttempts };
  }
}

/**
 * Clear failed login attempts after successful login.
 */
export async function clearFailedLogins(identifier: string): Promise<void> {
  const key = `failed_login:${identifier}`;

  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (err) {
    console.error('[RateLimit] Redis error clearing failed logins:', err);
  }
}

import { NextResponse } from 'next/server';
import { rateLimitApi, rateLimitLogin, getRateLimitIdentifier } from './rate-limit';

/**
 * Wrapper for API route handlers with rate limiting.
 * Use this for general API endpoints.
 */
export function withRateLimit<T extends Request>(
  handler: (req: T) => Promise<NextResponse>
): (req: T) => Promise<NextResponse> {
  return async (req: T) => {
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResponse = await rateLimitApi(identifier);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    return handler(req);
  };
}

/**
 * Wrapper for login/auth endpoints with stricter rate limiting.
 */
export function withLoginRateLimit<T extends Request>(
  handler: (req: T) => Promise<NextResponse>
): (req: T) => Promise<NextResponse> {
  return async (req: T) => {
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResponse = await rateLimitLogin(identifier);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    return handler(req);
  };
}

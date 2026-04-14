import { securityConfigService } from '@/modules/settings/services/security-config.service';
import type { SessionConfig } from '@/modules/settings/types';

// Cache session config for 60 seconds
let cachedConfig: { config: SessionConfig; expiry: number } | null = null;

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  idleTimeoutMinutes: 30,
  maxSessionHours: 24,
  allowMultipleSessions: true,
};

/**
 * Get current session configuration from DB.
 * Cached for 60 seconds to avoid frequent DB calls.
 */
export async function getSessionConfig(): Promise<SessionConfig> {
  const now = Date.now();
  if (cachedConfig && now < cachedConfig.expiry) {
    return cachedConfig.config;
  }

  try {
    const config = await securityConfigService.get();
    cachedConfig = { config: config.session, expiry: now + 60_000 };
    return config.session;
  } catch (err) {
    console.error('[SessionConfig] Failed to get config:', err);
    return DEFAULT_SESSION_CONFIG;
  }
}

/**
 * Check if a JWT token is expired based on current session config.
 * @param tokenIssuedAt - Token issued at timestamp (seconds since epoch)
 * @returns true if the token should be considered expired
 */
export async function isSessionExpired(tokenIssuedAt: number): Promise<boolean> {
  const config = await getSessionConfig();
  const maxAgeSeconds = config.maxSessionHours * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  
  return (now - tokenIssuedAt) > maxAgeSeconds;
}
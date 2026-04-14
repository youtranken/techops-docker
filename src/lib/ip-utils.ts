// ─── IP Utilities ─────────────────────────────────────────────────────────────

export type IpInfo = {
  ipType: 'internal' | 'external';
  ispName: string | null;
  city: string | null;
  country: string | null;
};

type IpApiResponse = {
  status: 'success' | 'fail';
  isp?: string;
  city?: string;
  country?: string;
};

// In-memory cache with 1h TTL
const cache = new Map<string, { data: IpInfo; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Strip ::ffff: IPv4-mapped prefix, take first IP from comma-separated list */
export function normalizeIp(raw: string | null | undefined): string {
  if (!raw) return 'unknown';
  const first = raw.split(',')[0].trim();
  return first.replace(/^::ffff:/i, '');
}

/** Detect RFC-1918 / loopback / link-local addresses */
export function isPrivateIp(ip: string): boolean {
  if (ip === 'unknown' || ip === '::1' || ip === 'localhost') return true;
  if (/^127\./.test(ip)) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

/**
 * Lookup ISP/city/country for an IP via ip-api.com (free, no key, 45 req/min).
 * Private IPs return { ipType: 'internal', ispName: 'Mạng nội bộ', ... }.
 * Results are cached in-memory for 1h.
 */
export async function lookupIpInfo(ip: string): Promise<IpInfo> {
  const normalized = normalizeIp(ip);

  if (isPrivateIp(normalized)) {
    return { ipType: 'internal', ispName: 'Mạng nội bộ', city: null, country: 'Vietnam' };
  }

  const cached = cache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${normalized}?fields=status,isp,city,country`,
      { signal: AbortSignal.timeout(3000) }
    );
    const json: IpApiResponse = await res.json();

    const data: IpInfo =
      json.status === 'success'
        ? {
            ipType: 'external',
            ispName: json.isp ?? null,
            city: json.city ?? null,
            country: json.country ?? null,
          }
        : { ipType: 'external', ispName: null, city: null, country: null };

    cache.set(normalized, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch {
    const fallback: IpInfo = { ipType: 'external', ispName: null, city: null, country: null };
    return fallback;
  }
}

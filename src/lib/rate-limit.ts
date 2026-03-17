import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Creates a rate limiter backed by an in-memory LRU cache.
 * Suitable for single-instance deployments (Vercel serverless, etc.).
 */
export function createRateLimiter(opts: RateLimitOptions) {
  const cache = new LRUCache<string, RateLimitEntry>({
    max: 5000, // Track up to 5000 unique IPs
    ttl: opts.windowSeconds * 1000,
  });

  return {
    /**
     * Check if a request from this key should be allowed.
     * Returns { allowed, remaining, resetAt }.
     */
    check(key: string): {
      allowed: boolean;
      remaining: number;
      resetAt: number;
    } {
      const now = Date.now();
      const existing = cache.get(key);

      if (!existing || now > existing.resetAt) {
        // First request in this window
        const resetAt = now + opts.windowSeconds * 1000;
        cache.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: opts.limit - 1, resetAt };
      }

      if (existing.count >= opts.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.resetAt,
        };
      }

      existing.count += 1;
      cache.set(key, existing);

      return {
        allowed: true,
        remaining: opts.limit - existing.count,
        resetAt: existing.resetAt,
      };
    },
  };
}

// Shared singleton — 30 requests per 60 seconds per IP
export const searchRateLimiter = createRateLimiter({
  limit: 30,
  windowSeconds: 60,
});
// Admin endpoints: 5 requests per 60 seconds per IP
export const adminRateLimiter = createRateLimiter({
  limit: 5,
  windowSeconds: 60,
});

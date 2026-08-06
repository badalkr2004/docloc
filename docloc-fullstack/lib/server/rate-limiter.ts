import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// Fallback in-memory rate limiter for local dev / free tier without Redis
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export const rateLimiter = {
  /**
   * Checks if a specific key has exceeded its limit.
   * @param key Unique identifier (e.g., IP address or Grant ID)
   * @param limit Maximum number of requests allowed
   * @param windowMs Time window in milliseconds
   * @returns boolean true if allowed, false if rate limited
   */
  check: async (key: string, limit: number, windowMs: number): Promise<boolean> => {
    // 1. Use Upstash Redis if configured
    if (redis) {
      // Create a temporary ratelimiter instance for this specific limit/window combo
      const windowStr = `${Math.ceil(windowMs / 1000)} s` as any;
      const limiter = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(limit, windowStr),
        ephemeralCache: new Map(), // Optional local cache for edge
      });
      const { success } = await limiter.limit(key);
      return success;
    }

    // 2. Fallback to in-memory map
    const now = Date.now();
    const record = inMemoryStore.get(key);

    if (!record || record.resetAt < now) {
      inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count += 1;
    return true;
  },

  cleanup: () => {
    const now = Date.now();
    for (const [key, record] of inMemoryStore.entries()) {
      if (record.resetAt < now) {
        inMemoryStore.delete(key);
      }
    }
  }
};

if (typeof setInterval !== 'undefined') {
  setInterval(rateLimiter.cleanup, 60000).unref?.();
}

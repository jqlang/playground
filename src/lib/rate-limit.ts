// Lightweight in-memory fixed-window rate limiter.
//
// Scoped per process, so on a multi-machine deploy each instance enforces the
// limit independently. That is intentional: this is a cheap abuse/DoS guard
// for the public, unauthenticated /api/jq route (it bounds how fast one client
// can pile work onto the jq worker pool), not a distributed quota system.

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSec: number;
}

interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Sweep expired buckets once the map grows past this, so abusive key churn
// (e.g. spoofed IPs) can't leak memory unboundedly.
const MAX_TRACKED_KEYS = 10_000;

function sweepExpired(now: number): void {
    for (const [key, bucket] of buckets) {
        if (now >= bucket.resetAt) {
            buckets.delete(key);
        }
    }
}

/**
 * Record a request against `key` and report whether it is allowed under a
 * fixed window of `windowMs` permitting `limit` requests.
 *
 * @param now - injectable clock for deterministic tests; defaults to Date.now().
 */
export function rateLimit(
    key: string,
    limit: number,
    windowMs: number,
    now: number = Date.now(),
): RateLimitResult {
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
        if (buckets.size >= MAX_TRACKED_KEYS) {
            sweepExpired(now);
        }
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
    }

    if (bucket.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
        };
    }

    bucket.count++;
    return { allowed: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

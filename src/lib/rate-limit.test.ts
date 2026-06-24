import { describe, it, expect } from 'vitest';
import { rateLimit } from './rate-limit';

describe('rateLimit (fixed window, in-memory)', () => {
    it('allows requests up to the limit', () => {
        const key = 'test-allow';
        const r1 = rateLimit(key, 3, 1000, 1000);
        const r2 = rateLimit(key, 3, 1000, 1100);
        const r3 = rateLimit(key, 3, 1000, 1200);
        expect([r1.allowed, r2.allowed, r3.allowed]).toEqual([true, true, true]);
        expect(r3.remaining).toBe(0);
    });

    it('blocks the request that exceeds the limit and reports retryAfter', () => {
        const key = 'test-block';
        rateLimit(key, 2, 1000, 1000);
        rateLimit(key, 2, 1000, 1100);
        const blocked = rateLimit(key, 2, 1000, 1500);
        expect(blocked.allowed).toBe(false);
        // window opened at 1000 resets at 2000; from 1500 that is 0.5s -> ceil = 1
        expect(blocked.retryAfterSec).toBe(1);
    });

    it('resets after the window elapses', () => {
        const key = 'test-reset';
        rateLimit(key, 1, 1000, 1000);
        expect(rateLimit(key, 1, 1000, 1500).allowed).toBe(false);
        expect(rateLimit(key, 1, 1000, 2000).allowed).toBe(true);
    });

    it('tracks keys independently', () => {
        expect(rateLimit('ip-a', 1, 1000, 1000).allowed).toBe(true);
        expect(rateLimit('ip-b', 1, 1000, 1000).allowed).toBe(true);
    });
});

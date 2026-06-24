import { describe, it, expect } from 'vitest';
import { runJqWithTimeout, TimeoutError, computeMaxThreads } from './pool';

describe('runJqWithTimeout', () => {
    describe('basic jq execution', () => {
        it('executes a simple query', async () => {
            const result = await runJqWithTimeout('{"a": 1}', '.a', undefined, 5000);
            expect(result).toBe('1');
        });

        it('executes identity query', async () => {
            const result = await runJqWithTimeout('{"foo": "bar"}', '.', ['-c'], 5000);
            expect(result).toBe('{"foo":"bar"}');
        });

        it('extracts nested values', async () => {
            const result = await runJqWithTimeout('{"a": {"b": {"c": 42}}}', '.a.b.c', undefined, 5000);
            expect(result).toBe('42');
        });

        it('handles array operations', async () => {
            const result = await runJqWithTimeout('[1, 2, 3, 4, 5]', 'map(. * 2)', ['-c'], 5000);
            expect(result).toBe('[2,4,6,8,10]');
        });

        it('handles null input with -n flag', async () => {
            const result = await runJqWithTimeout('null', '1 + 1', ['-n'], 5000);
            expect(result).toBe('2');
        });
    });

    describe('jq options', () => {
        it('uses -r for raw output', async () => {
            const result = await runJqWithTimeout('{"name": "test"}', '.name', ['-r'], 5000);
            expect(result).toBe('test');
        });

        it('uses -c for compact output', async () => {
            const result = await runJqWithTimeout('{"a": 1, "b": 2}', '.', ['-c'], 5000);
            expect(result).toBe('{"a":1,"b":2}');
        });

        it('uses -s for slurp mode', async () => {
            const result = await runJqWithTimeout('1\n2\n3', '.', ['-s', '-c'], 5000);
            expect(result).toBe('[1,2,3]');
        });
    });

    describe('error handling', () => {
        it('returns stderr for invalid query', async () => {
            const result = await runJqWithTimeout('{}', '.invalid[', undefined, 5000);
            expect(result).toContain('error');
        });

        it('returns stderr for invalid JSON', async () => {
            const result = await runJqWithTimeout('not valid json', '.', undefined, 5000);
            expect(result).toContain('error');
        });
    });

    describe('timeout behavior', () => {
        it('throws TimeoutError for long-running queries', async () => {
            // This query runs forever
            const infiniteQuery = 'def f: f; f';

            await expect(
                runJqWithTimeout('null', infiniteQuery, ['-n'], 100)
            ).rejects.toThrow(TimeoutError);
        });

        it('completes fast queries within timeout', async () => {
            const result = await runJqWithTimeout('{"x": 1}', '.x', undefined, 5000);
            expect(result).toBe('1');
        });
    });

    describe('concurrent execution', () => {
        it('handles multiple concurrent requests', async () => {
            const queries = [
                runJqWithTimeout('{"a": 1}', '.a', undefined, 5000),
                runJqWithTimeout('{"b": 2}', '.b', undefined, 5000),
                runJqWithTimeout('{"c": 3}', '.c', undefined, 5000),
                runJqWithTimeout('{"d": 4}', '.d', undefined, 5000),
            ];

            const results = await Promise.all(queries);
            expect(results).toEqual(['1', '2', '3', '4']);
        });

        it('handles more requests than pool size', async () => {
            // More requests than the worker count, so this exercises queueing
            const queries = Array.from({ length: 8 }, (_, i) =>
                runJqWithTimeout(`{"n": ${i}}`, '.n', undefined, 5000)
            );

            const results = await Promise.all(queries);
            expect(results).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
        });
    });
});

describe('computeMaxThreads (memory-based pool sizing)', () => {
    const MB = 1024 * 1024;

    it('keeps the tuned value of 2 on a ~512MB Fly machine', () => {
        // A "512MB" Fly machine reports ~470-500MB MemTotal (Firecracker reserve).
        expect(computeMaxThreads(512 * MB)).toBe(2);
        expect(computeMaxThreads(490 * MB)).toBe(2);
        expect(computeMaxThreads(470 * MB)).toBe(2);
    });

    it('floors at 1 on tiny machines', () => {
        expect(computeMaxThreads(256 * MB)).toBe(1);
        expect(computeMaxThreads(128 * MB)).toBe(1);
    });

    it('scales up with more memory but stays hard-capped', () => {
        expect(computeMaxThreads(1024 * MB)).toBeGreaterThan(2);
        // A misread (host RAM on a cgroup-limited container) must not explode the pool.
        expect(computeMaxThreads(64 * 1024 * MB)).toBeLessThanOrEqual(4);
    });
});

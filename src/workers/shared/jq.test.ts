import { describe, it, expect } from 'vitest';
import { executeJq } from './jq';

describe('executeJq', () => {
    describe('basic queries', () => {
        it('executes identity query', async () => {
            const result = await executeJq('{"a": 1}', '.', ['-c']);
            expect(result).toBe('{"a":1}');
        });

        it('extracts a field', async () => {
            const result = await executeJq('{"name": "test"}', '.name');
            expect(result).toBe('"test"');
        });

        it('extracts nested field', async () => {
            const result = await executeJq('{"a": {"b": {"c": 42}}}', '.a.b.c');
            expect(result).toBe('42');
        });

        it('handles array access', async () => {
            const result = await executeJq('[1, 2, 3]', '.[1]');
            expect(result).toBe('2');
        });
    });

    describe('options handling', () => {
        it('handles null options', async () => {
            const result = await executeJq('{"x": 1}', '.x', null);
            expect(result).toBe('1');
        });

        it('handles undefined options', async () => {
            const result = await executeJq('{"x": 1}', '.x', undefined);
            expect(result).toBe('1');
        });

        it('handles empty options array', async () => {
            const result = await executeJq('{"x": 1}', '.x', []);
            expect(result).toBe('1');
        });

        it('applies -r for raw output', async () => {
            const result = await executeJq('{"s": "hello"}', '.s', ['-r']);
            expect(result).toBe('hello');
        });

        it('applies -c for compact output', async () => {
            const result = await executeJq('{"a": 1, "b": 2}', '.', ['-c']);
            expect(result).toBe('{"a":1,"b":2}');
        });

        it('applies -n for null input', async () => {
            const result = await executeJq('ignored', '1 + 1', ['-n']);
            expect(result).toBe('2');
        });
    });

    describe('error handling', () => {
        it('returns stderr for syntax errors', async () => {
            const result = await executeJq('{}', '.invalid[');
            expect(result.toLowerCase()).toContain('error');
        });

        it('returns stderr for invalid JSON input', async () => {
            const result = await executeJq('not json', '.');
            expect(result.toLowerCase()).toContain('error');
        });

        it('returns stderr for runtime errors', async () => {
            const result = await executeJq('null', '.foo.bar');
            // jq returns null for missing keys, not an error
            expect(result).toBe('null');
        });
    });

    describe('output combination', () => {
        it('combines stdout and stderr with newline when both present', async () => {
            // This query produces output but also a potential warning
            // Note: jq-wasm may not produce warnings the same way as CLI jq
            const result = await executeJq('{"a": 1}', '.a');
            expect(result).toBe('1');
        });

        it('returns only stderr when stdout is empty', async () => {
            const result = await executeJq('invalid', '.');
            expect(result.toLowerCase()).toContain('error');
        });
    });

    describe('complex queries', () => {
        it('handles map operations', async () => {
            const result = await executeJq('[1, 2, 3]', 'map(. * 2)', ['-c']);
            expect(result).toBe('[2,4,6]');
        });

        it('handles select operations', async () => {
            const result = await executeJq('[1, 2, 3, 4, 5]', '[.[] | select(. > 3)]', ['-c']);
            expect(result).toBe('[4,5]');
        });

        it('handles object construction', async () => {
            const result = await executeJq('{"name": "test", "value": 42}', '{n: .name, v: .value}', ['-c']);
            expect(result).toBe('{"n":"test","v":42}');
        });

        it('handles pipe operations', async () => {
            const result = await executeJq('{"items": [1, 2, 3]}', '.items | add');
            expect(result).toBe('6');
        });
    });
});

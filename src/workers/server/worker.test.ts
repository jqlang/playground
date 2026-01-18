import { describe, it, expect } from 'vitest';
import path from 'path';

// Test the worker function directly by requiring it
const workerFn = require(path.join(process.cwd(), 'src/workers/server/worker.cjs'));

describe('worker.cjs', () => {
    it('executes basic jq query', async () => {
        const result = await workerFn({ json: '{"test": 123}', query: '.test', options: undefined });
        expect(result).toBe('123');
    });

    it('handles options parameter', async () => {
        const result = await workerFn({ json: '{"name": "hello"}', query: '.name', options: ['-r'] });
        expect(result).toBe('hello');
    });

    it('includes stderr in output for errors', async () => {
        const result = await workerFn({ json: 'invalid json', query: '.', options: undefined });
        expect(result).toContain('error');
    });

    it('combines stdout and stderr when both present', async () => {
        const result = await workerFn({ json: '{}', query: '.missing // "default"', options: undefined });
        expect(result).toBe('"default"');
    });

    it('handles null options', async () => {
        const result = await workerFn({ json: '{"x": 1}', query: '.x', options: null });
        expect(result).toBe('1');
    });
});

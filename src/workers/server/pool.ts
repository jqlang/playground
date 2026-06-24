import path from 'path';
import Piscina from 'piscina';

export class TimeoutError extends Error {
    constructor(message: string = 'Query execution timed out') {
        super(message);
        this.name = 'TimeoutError';
    }
}

export class PoolOverloadError extends Error {
    constructor(message: string = 'jq worker pool is at capacity') {
        super(message);
        this.name = 'PoolOverloadError';
    }
}

// Cap on tasks waiting for a free worker. Each queued task holds its JSON
// payload (up to MAX_JSON_SIZE) in memory, so an unbounded queue is an OOM
// vector on the small (512MB) Fly machine. Reject past this instead of buffering.
const MAX_QUEUE = 40;

// Lazy-initialize pool to avoid webpack bundling issues
let pool: Piscina | null = null;

// Build path in a way webpack can't statically analyze
const workerFile = ['src', 'workers', 'server', 'worker.cjs'].join(path.sep);

function getPool(): Piscina {
    if (!pool) {
        pool = new Piscina({
            filename: path.join(process.cwd(), workerFile),
            // Right-sized for a 1-vCPU / 512MB Fly machine: each worker loads its
            // own jq-wasm heap, and worker_threads share the process RSS. minThreads:0
            // keeps zero jq-wasm instances resident while the API is idle; maxThreads:2
            // avoids oversubscribing the single shared vCPU under load.
            minThreads: 0,
            maxThreads: 2,
            idleTimeout: 10000,
        });
    }
    return pool;
}

export async function runJqWithTimeout(
    json: string,
    query: string,
    options: string[] | undefined,
    timeoutMs: number
): Promise<string> {
    const pool = getPool();
    // Shed load instead of letting the queue (and its payloads) grow unbounded.
    if (pool.queueSize >= MAX_QUEUE) {
        throw new PoolOverloadError();
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
        const result = await pool.run(
            { json, query, options },
            { signal: abortController.signal }
        );
        return result;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new TimeoutError();
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

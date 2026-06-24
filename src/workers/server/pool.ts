import os from 'os';
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

// jq workers are memory-bound: each loads its own jq-wasm heap (input up to
// MAX_JSON_SIZE plus processing overhead) and worker_threads share the process
// RSS — so size the pool off available RAM, not CPU. os.totalmem() reflects the
// VM's allocated memory on Fly (Firecracker); on plain cgroup-limited containers
// it can over-report host RAM, so HARD_CAP and the JQ_POOL_* env overrides are the
// safety nets. Constants are empirical, calibrated so a 512MB machine yields 2.
const SERVER_RESERVE_MB = 290; // Next.js standalone server baseline + headroom
const PER_WORKER_MB = 90;      // rough resident budget per jq-wasm worker under load
const HARD_CAP = 4;

export function computeMaxThreads(totalMemBytes: number): number {
    const totalMb = totalMemBytes / (1024 * 1024);
    const budget = Math.floor((totalMb - SERVER_RESERVE_MB) / PER_WORKER_MB);
    return Math.min(HARD_CAP, Math.max(1, budget));
}

// Env overrides are authoritative; otherwise derive the default from the machine.
const MAX_THREADS = Number(process.env.JQ_POOL_MAX_THREADS) || computeMaxThreads(os.totalmem());

// Cap on tasks waiting for a free worker. Each queued task holds its JSON payload
// (up to MAX_JSON_SIZE) in memory, so an unbounded queue is an OOM vector. Scales
// with the worker count; override via JQ_POOL_MAX_QUEUE.
const MAX_QUEUE = Number(process.env.JQ_POOL_MAX_QUEUE) || MAX_THREADS * 20;

// Lazy-initialize pool to avoid webpack bundling issues
let pool: Piscina | null = null;

// Build path in a way webpack can't statically analyze
const workerFile = ['src', 'workers', 'server', 'worker.cjs'].join(path.sep);

function getPool(): Piscina {
    if (!pool) {
        pool = new Piscina({
            filename: path.join(process.cwd(), workerFile),
            // minThreads:0 keeps zero jq-wasm instances resident while the API is idle.
            // maxThreads is sized off available RAM (see computeMaxThreads / JQ_POOL_*),
            // since each worker holds its own jq-wasm heap and shares the process RSS.
            minThreads: 0,
            maxThreads: MAX_THREADS,
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
